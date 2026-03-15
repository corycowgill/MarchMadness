const express = require('express');
const path = require('path');
const db = require('./db');

// Seed teams on startup
require('./seed-teams');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── AUTH ROUTES ──────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  const { screen_name, key_code } = req.body;
  if (!screen_name || !key_code) {
    return res.status(400).json({ error: 'Screen name and key code are required' });
  }
  if (screen_name.length < 2 || screen_name.length > 20) {
    return res.status(400).json({ error: 'Screen name must be 2-20 characters' });
  }
  if (key_code.length < 4 || key_code.length > 20) {
    return res.status(400).json({ error: 'Key code must be 4-20 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE screen_name = ?').get(screen_name);
  if (existing) {
    return res.status(409).json({ error: 'Screen name already taken' });
  }

  const result = db.prepare('INSERT INTO users (screen_name, key_code) VALUES (?, ?)').run(screen_name, key_code);
  res.json({ id: result.lastInsertRowid, screen_name });
});

app.post('/api/login', (req, res) => {
  const { screen_name, key_code } = req.body;
  if (!screen_name || !key_code) {
    return res.status(400).json({ error: 'Screen name and key code are required' });
  }

  const user = db.prepare('SELECT id, screen_name FROM users WHERE screen_name = ? AND key_code = ?').get(screen_name, key_code);
  if (!user) {
    return res.status(401).json({ error: 'Invalid screen name or key code' });
  }
  res.json(user);
});

// ─── TEAMS ROUTES ─────────────────────────────────────────────

app.get('/api/teams', (req, res) => {
  const teams = db.prepare('SELECT * FROM teams ORDER BY region, seed').all();
  res.json(teams);
});

// ─── TOURNAMENT ROUTES ────────────────────────────────────────

app.get('/api/tournament', (req, res) => {
  const games = db.prepare(`
    SELECT t.*,
      t1.name as team1_name, t1.seed as team1_seed, t1.short_name as team1_short,
      t2.name as team2_name, t2.seed as team2_seed, t2.short_name as team2_short,
      w.name as winner_name, w.short_name as winner_short
    FROM tournament t
    LEFT JOIN teams t1 ON t.team1_id = t1.id
    LEFT JOIN teams t2 ON t.team2_id = t2.id
    LEFT JOIN teams w ON t.winner_id = w.id
    ORDER BY t.round, t.game_number
  `).all();
  res.json(games);
});

// Admin: update game result
app.post('/api/admin/game-result', (req, res) => {
  const { game_id, winner_id, team1_score, team2_score, admin_code } = req.body;
  // Simple admin auth - set ADMIN_CODE env var or default
  const ADMIN_CODE = process.env.ADMIN_CODE || 'admin2026';
  if (admin_code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Invalid admin code' });
  }

  db.prepare(`
    UPDATE tournament SET winner_id = ?, team1_score = ?, team2_score = ?, status = 'final'
    WHERE id = ?
  `).run(winner_id, team1_score || null, team2_score || null, game_id);

  // Mark losing team as eliminated
  const game = db.prepare('SELECT team1_id, team2_id FROM tournament WHERE id = ?').get(game_id);
  if (game) {
    const loserId = game.team1_id === winner_id ? game.team2_id : game.team1_id;
    if (loserId) {
      db.prepare('UPDATE teams SET eliminated = 1 WHERE id = ?').run(loserId);
    }
  }

  res.json({ success: true });
});

// Admin: toggle bracket lock
app.post('/api/admin/lock-brackets', (req, res) => {
  const { locked, admin_code } = req.body;
  const ADMIN_CODE = process.env.ADMIN_CODE || 'admin2026';
  if (admin_code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Invalid admin code' });
  }
  db.prepare("UPDATE settings SET value = ? WHERE key = 'brackets_locked'").run(locked ? '1' : '0');
  res.json({ success: true, locked });
});

app.get('/api/settings', (req, res) => {
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(row => {
    settings[row.key] = row.value;
  });
  res.json(settings);
});

// ─── BRACKET ROUTES ───────────────────────────────────────────

app.get('/api/brackets/:userId', (req, res) => {
  const brackets = db.prepare('SELECT * FROM brackets WHERE user_id = ? ORDER BY created_at').all(req.params.userId);
  res.json(brackets);
});

app.post('/api/brackets', (req, res) => {
  const { user_id, name } = req.body;
  if (!user_id || !name) {
    return res.status(400).json({ error: 'User ID and bracket name are required' });
  }

  const locked = db.prepare("SELECT value FROM settings WHERE key = 'brackets_locked'").get();
  if (locked && locked.value === '1') {
    return res.status(403).json({ error: 'Brackets are locked! Tournament has started.' });
  }

  const result = db.prepare('INSERT INTO brackets (user_id, name) VALUES (?, ?)').run(user_id, name);
  res.json({ id: result.lastInsertRowid, name });
});

app.delete('/api/brackets/:bracketId', (req, res) => {
  const { user_id } = req.body;
  const bracket = db.prepare('SELECT * FROM brackets WHERE id = ? AND user_id = ?').get(req.params.bracketId, user_id);
  if (!bracket) return res.status(404).json({ error: 'Bracket not found' });
  if (bracket.locked) return res.status(403).json({ error: 'Cannot delete a locked bracket' });

  db.prepare('DELETE FROM picks WHERE bracket_id = ?').run(req.params.bracketId);
  db.prepare('DELETE FROM brackets WHERE id = ?').run(req.params.bracketId);
  res.json({ success: true });
});

// ─── PICKS ROUTES ─────────────────────────────────────────────

app.get('/api/picks/:bracketId', (req, res) => {
  const picks = db.prepare(`
    SELECT p.*, t.name as team_name, t.seed, t.short_name, t.region
    FROM picks p
    JOIN teams t ON p.team_id = t.id
    WHERE p.bracket_id = ?
    ORDER BY p.round, p.game_number
  `).all(req.params.bracketId);
  res.json(picks);
});

app.post('/api/picks', (req, res) => {
  const { bracket_id, picks } = req.body;
  if (!bracket_id || !picks || !Array.isArray(picks)) {
    return res.status(400).json({ error: 'Bracket ID and picks array are required' });
  }

  const locked = db.prepare("SELECT value FROM settings WHERE key = 'brackets_locked'").get();
  if (locked && locked.value === '1') {
    return res.status(403).json({ error: 'Brackets are locked! Tournament has started.' });
  }

  const bracket = db.prepare('SELECT * FROM brackets WHERE id = ?').get(bracket_id);
  if (!bracket) return res.status(404).json({ error: 'Bracket not found' });

  const upsert = db.prepare(`
    INSERT INTO picks (bracket_id, round, game_number, team_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(bracket_id, round, game_number)
    DO UPDATE SET team_id = excluded.team_id
  `);

  const savePicks = db.transaction(() => {
    for (const pick of picks) {
      upsert.run(bracket_id, pick.round, pick.game_number, pick.team_id);
    }
  });

  savePicks();
  res.json({ success: true });
});

// ─── SCORING & LEADERBOARD ───────────────────────────────────

const POINTS_PER_ROUND = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };
const ROUND_NAMES = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship'
};

app.get('/api/leaderboard', (req, res) => {
  // Get all completed games
  const completedGames = db.prepare(
    "SELECT round, game_number, winner_id FROM tournament WHERE status = 'final' AND winner_id IS NOT NULL"
  ).all();

  // Build a map of correct answers
  const correctPicks = {};
  for (const game of completedGames) {
    correctPicks[`${game.round}-${game.game_number}`] = game.winner_id;
  }

  // Get all brackets with their picks
  const brackets = db.prepare(`
    SELECT b.id as bracket_id, b.name as bracket_name, b.user_id,
           u.screen_name
    FROM brackets b
    JOIN users u ON b.user_id = u.id
    ORDER BY u.screen_name
  `).all();

  const leaderboard = [];

  for (const bracket of brackets) {
    const picks = db.prepare(
      'SELECT round, game_number, team_id FROM picks WHERE bracket_id = ?'
    ).all(bracket.bracket_id);

    let totalPoints = 0;
    let correctCount = 0;
    const roundBreakdown = {};

    for (const pick of picks) {
      const key = `${pick.round}-${pick.game_number}`;
      if (correctPicks[key] && correctPicks[key] === pick.team_id) {
        const pts = POINTS_PER_ROUND[pick.round] || 1;
        totalPoints += pts;
        correctCount++;
        roundBreakdown[pick.round] = (roundBreakdown[pick.round] || 0) + pts;
      }
    }

    leaderboard.push({
      bracket_id: bracket.bracket_id,
      bracket_name: bracket.bracket_name,
      screen_name: bracket.screen_name,
      user_id: bracket.user_id,
      total_points: totalPoints,
      correct_picks: correctCount,
      total_picks: picks.length,
      round_breakdown: roundBreakdown,
    });
  }

  leaderboard.sort((a, b) => b.total_points - a.total_points);

  // Add rank
  let rank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].total_points < leaderboard[i - 1].total_points) {
      rank = i + 1;
    }
    leaderboard[i].rank = rank;
  }

  res.json({ leaderboard, pointsPerRound: POINTS_PER_ROUND, roundNames: ROUND_NAMES });
});

// ─── SCORE FETCHING (Manual + API) ───────────────────────────

app.post('/api/admin/fetch-scores', async (req, res) => {
  const { admin_code } = req.body;
  const ADMIN_CODE = process.env.ADMIN_CODE || 'admin2026';
  if (admin_code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Invalid admin code' });
  }

  // Fetch from NCAA scoreboard API
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '')
    );
    const data = await response.json();

    if (data.events) {
      const updates = [];
      for (const event of data.events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');

        if (homeTeam && awayTeam) {
          updates.push({
            home: homeTeam.team?.displayName,
            away: awayTeam.team?.displayName,
            homeScore: parseInt(homeTeam.score) || 0,
            awayScore: parseInt(awayTeam.score) || 0,
            status: competition.status?.type?.completed ? 'final' : 'in_progress',
          });
        }
      }
      res.json({ success: true, games: updates, message: `Found ${updates.length} games today` });
    } else {
      res.json({ success: true, games: [], message: 'No games found for today' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores: ' + err.message });
  }
});

// ─── ADMIN: Bulk update teams ─────────────────────────────────

app.post('/api/admin/update-teams', (req, res) => {
  const { admin_code, teams } = req.body;
  const ADMIN_CODE = process.env.ADMIN_CODE || 'admin2026';
  if (admin_code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Invalid admin code' });
  }

  if (!teams || !Array.isArray(teams)) {
    return res.status(400).json({ error: 'Teams array required' });
  }

  const update = db.prepare('UPDATE teams SET name = ?, short_name = ? WHERE region = ? AND seed = ?');
  const updateAll = db.transaction(() => {
    for (const team of teams) {
      update.run(team.name, team.short_name, team.region, team.seed);
    }
  });
  updateAll();

  res.json({ success: true });
});

// ─── SPA FALLBACK ─────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏀 March Madness Bracket Pool running on port ${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser`);
});
