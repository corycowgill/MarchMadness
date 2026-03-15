/* ─── March Madness Bracket Pool - Frontend App ──────────── */

const API = '';
let currentUser = null;
let currentBracketId = null;
let allTeams = [];
let bracketPicks = {};

// ─── HELPERS ──────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.add('hidden'));
  const el = $(`#${id}Screen`);
  if (el) el.classList.remove('hidden');
}

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function showModal(title, bodyHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
}

function hideModal() {
  $('#modal').classList.add('hidden');
}

// ─── AUTH ─────────────────────────────────────────────────

function setupAuth() {
  // Tab switching
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#loginForm').classList.toggle('hidden', !isLogin);
      $('#registerForm').classList.toggle('hidden', isLogin);
      $('#authError').classList.add('hidden');
    });
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const user = await api('/api/login', {
        method: 'POST',
        body: { screen_name: $('#loginName').value.trim(), key_code: $('#loginCode').value },
      });
      loginSuccess(user);
    } catch (err) {
      showError(err.message);
    }
  });

  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const user = await api('/api/register', {
        method: 'POST',
        body: { screen_name: $('#regName').value.trim(), key_code: $('#regCode').value },
      });
      loginSuccess(user);
    } catch (err) {
      showError(err.message);
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('mm_user');
    $('#nav').classList.add('hidden');
    showScreen('auth');
  });
}

function showError(msg) {
  const el = $('#authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem('mm_user', JSON.stringify(user));
  $('#userBadge').textContent = user.screen_name;
  $('#nav').classList.remove('hidden');
  $('#authError').classList.add('hidden');
  loadBrackets();
  showScreen('bracket');
}

// ─── NAV ──────────────────────────────────────────────────

function setupNav() {
  $$('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      if (page === 'bracket') { loadBrackets(); showScreen('bracket'); }
      else if (page === 'leaderboard') { loadLeaderboard(); showScreen('leaderboard'); }
      else if (page === 'scores') { loadTournamentResults(); showScreen('scores'); }
    });
  });
}

// ─── BRACKETS ─────────────────────────────────────────────

async function loadBrackets() {
  if (!currentUser) return;
  try {
    const brackets = await api(`/api/brackets/${currentUser.id}`);
    renderBracketList(brackets);
  } catch (err) {
    showToast('Error loading brackets');
  }
}

function renderBracketList(brackets) {
  const el = $('#bracketList');
  if (brackets.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <span class="empty-icon">📋</span>
      <p>No brackets yet! Create one to get started.</p>
    </div>`;
    return;
  }

  el.innerHTML = brackets.map(b => `
    <div class="bracket-card" data-id="${b.id}">
      <h3>🏀 ${esc(b.name)}</h3>
      <div class="bracket-meta">
        <span>Created ${new Date(b.created_at).toLocaleDateString()}</span>
        <span class="pick-count">${b.locked ? '🔒 Locked' : '✏️ Editable'}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary btn-sm edit-bracket-btn" data-id="${b.id}" data-name="${esc(b.name)}">Edit Picks</button>
        <button class="btn btn-danger btn-sm delete-bracket-btn" data-id="${b.id}">Delete</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.edit-bracket-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openBracketEditor(parseInt(btn.dataset.id), btn.dataset.name);
    });
  });

  el.querySelectorAll('.delete-bracket-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this bracket?')) return;
      try {
        await api(`/api/brackets/${btn.dataset.id}`, {
          method: 'DELETE',
          body: { user_id: currentUser.id },
        });
        showToast('Bracket deleted');
        loadBrackets();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

$('#newBracketBtn').addEventListener('click', () => {
  showModal('Create New Bracket', `
    <form id="newBracketForm">
      <div class="form-group">
        <label>Bracket Name</label>
        <input type="text" id="bracketNameInput" placeholder="e.g. My Cinderella Picks" maxlength="40" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Create Bracket</button>
    </form>
  `);

  $('#newBracketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/brackets', {
        method: 'POST',
        body: { user_id: currentUser.id, name: $('#bracketNameInput').value.trim() },
      });
      hideModal();
      showToast('Bracket created!');
      loadBrackets();
    } catch (err) {
      showToast(err.message);
    }
  });
});

// ─── BRACKET EDITOR ───────────────────────────────────────

const ROUND_NAMES = ['', 'Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];
const MATCHUP_SEEDS = [[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]];
const REGIONS = ['East', 'West', 'South', 'Midwest'];

async function openBracketEditor(bracketId, bracketName) {
  currentBracketId = bracketId;
  bracketPicks = {};

  // Load teams and picks
  if (allTeams.length === 0) {
    allTeams = await api('/api/teams');
  }

  try {
    const picks = await api(`/api/picks/${bracketId}`);
    for (const p of picks) {
      bracketPicks[`${p.round}-${p.game_number}`] = p.team_id;
    }
  } catch (e) { /* no picks yet */ }

  $('#editorTitle').textContent = bracketName;
  showScreen('editor');
  renderBracketEditor();
}

function getTeamsByRegion(region) {
  return allTeams.filter(t => t.region === region).sort((a, b) => a.seed - b.seed);
}

function renderBracketEditor() {
  const editor = $('#bracketEditor');

  // We'll render 4 regions, each with rounds 1-4, then Final Four + Championship
  let html = '';

  // For each region
  for (const region of REGIONS) {
    html += `<div class="region-bracket">
      <h3 style="font-family:var(--font-display);color:var(--accent);margin-bottom:12px;font-size:16px;">${region.toUpperCase()} REGION</h3>
      <div class="bracket-grid">`;

    const regionTeams = getTeamsByRegion(region);
    const regionIndex = REGIONS.indexOf(region);

    // Round 1: 8 matchups per region
    for (let round = 1; round <= 4; round++) {
      const gamesInRound = 8 / Math.pow(2, round - 1);
      html += `<div class="bracket-round">
        <div class="round-header">${ROUND_NAMES[round]}</div>`;

      for (let g = 0; g < gamesInRound; g++) {
        const gameNum = getGameNumber(region, round, g);

        if (round === 1) {
          // First round: teams from seed matchups
          const [seed1, seed2] = MATCHUP_SEEDS[g];
          const team1 = regionTeams.find(t => t.seed === seed1);
          const team2 = regionTeams.find(t => t.seed === seed2);
          const selected = bracketPicks[`1-${gameNum}`];

          html += renderMatchup(gameNum, 1, team1, team2, selected);
        } else {
          // Later rounds: winners from previous round
          const prevGame1 = getGameNumber(region, round - 1, g * 2);
          const prevGame2 = getGameNumber(region, round - 1, g * 2 + 1);
          const team1Id = bracketPicks[`${round-1}-${prevGame1}`];
          const team2Id = bracketPicks[`${round-1}-${prevGame2}`];
          const team1 = team1Id ? allTeams.find(t => t.id === team1Id) : null;
          const team2 = team2Id ? allTeams.find(t => t.id === team2Id) : null;
          const selected = bracketPicks[`${round}-${gameNum}`];

          html += renderMatchup(gameNum, round, team1, team2, selected);
        }
      }

      html += '</div>';
    }

    html += '</div></div>';
  }

  // Final Four
  html += `<div class="region-bracket">
    <h3 style="font-family:var(--font-display);color:var(--accent);margin-bottom:12px;font-size:16px;">FINAL FOUR & CHAMPIONSHIP</h3>
    <div class="bracket-grid">`;

  // Final Four: 2 games
  html += '<div class="bracket-round"><div class="round-header">Final Four</div>';

  // Game 1: East winner vs West winner
  const eastWinner = bracketPicks['4-' + getGameNumber('East', 4, 0)];
  const westWinner = bracketPicks['4-' + getGameNumber('West', 4, 0)];
  const f4t1 = eastWinner ? allTeams.find(t => t.id === eastWinner) : null;
  const f4t2 = westWinner ? allTeams.find(t => t.id === westWinner) : null;
  const f4g1Num = 101;
  html += renderMatchup(f4g1Num, 5, f4t1, f4t2, bracketPicks[`5-${f4g1Num}`], 'East vs West');

  // Game 2: South winner vs Midwest winner
  const southWinner = bracketPicks['4-' + getGameNumber('South', 4, 0)];
  const midwestWinner = bracketPicks['4-' + getGameNumber('Midwest', 4, 0)];
  const f4t3 = southWinner ? allTeams.find(t => t.id === southWinner) : null;
  const f4t4 = midwestWinner ? allTeams.find(t => t.id === midwestWinner) : null;
  const f4g2Num = 102;
  html += renderMatchup(f4g2Num, 5, f4t3, f4t4, bracketPicks[`5-${f4g2Num}`], 'South vs Midwest');

  html += '</div>';

  // Championship
  html += '<div class="bracket-round"><div class="round-header">Championship</div>';
  const champ1Id = bracketPicks[`5-${f4g1Num}`];
  const champ2Id = bracketPicks[`5-${f4g2Num}`];
  const champT1 = champ1Id ? allTeams.find(t => t.id === champ1Id) : null;
  const champT2 = champ2Id ? allTeams.find(t => t.id === champ2Id) : null;
  const champNum = 201;
  html += renderMatchup(champNum, 6, champT1, champT2, bracketPicks[`6-${champNum}`], 'National Championship');

  // Champion display
  const champWinnerId = bracketPicks[`6-${champNum}`];
  const champWinner = champWinnerId ? allTeams.find(t => t.id === champWinnerId) : null;
  if (champWinner) {
    html += `<div style="text-align:center;padding:20px;background:rgba(244,169,0,0.1);border-radius:12px;margin-top:8px;">
      <div style="font-size:32px;">🏆</div>
      <div style="font-family:var(--font-display);font-size:18px;color:var(--accent);margin-top:4px;">CHAMPION</div>
      <div style="font-size:16px;font-weight:700;margin-top:4px;">(${champWinner.seed}) ${champWinner.name}</div>
    </div>`;
  }

  html += '</div></div></div>';

  editor.innerHTML = html;

  // Attach click handlers
  editor.querySelectorAll('.team-slot[data-team-id]').forEach(slot => {
    slot.addEventListener('click', () => {
      const round = parseInt(slot.dataset.round);
      const gameNum = parseInt(slot.dataset.game);
      const teamId = parseInt(slot.dataset.teamId);

      bracketPicks[`${round}-${gameNum}`] = teamId;

      // Clear downstream picks that depended on this game
      clearDownstreamPicks(round, gameNum);

      renderBracketEditor();
    });
  });
}

function getGameNumber(region, round, index) {
  const regionIndex = REGIONS.indexOf(region);
  const gamesPerRegion = 8 / Math.pow(2, round - 1);
  return round * 100 + regionIndex * gamesPerRegion + index + 1;
}

function clearDownstreamPicks(round, gameNum) {
  // Find which downstream games depend on this game's winner
  // This is complex, so we just clear all later rounds for safety
  for (let r = round + 1; r <= 6; r++) {
    const keys = Object.keys(bracketPicks).filter(k => k.startsWith(`${r}-`));
    for (const key of keys) {
      // Check if this pick is still valid (the team exists in previous round picks)
      const teamId = bracketPicks[key];
      if (!isTeamStillAlive(teamId, r)) {
        delete bracketPicks[key];
      }
    }
  }
}

function isTeamStillAlive(teamId, upToRound) {
  // A team is alive if they are picked as winners in all previous rounds
  // Simple check: the team must appear in a pick in the previous round
  if (upToRound <= 1) return true;

  const prevRoundPicks = Object.entries(bracketPicks)
    .filter(([k]) => k.startsWith(`${upToRound - 1}-`))
    .map(([, v]) => v);

  return prevRoundPicks.includes(teamId);
}

function renderMatchup(gameNum, round, team1, team2, selectedId, label) {
  const t1Selected = team1 && selectedId === team1.id;
  const t2Selected = team2 && selectedId === team2.id;

  return `<div class="matchup">
    <div class="matchup-game-num">${label || `Game ${gameNum}`}</div>
    ${team1 ? `
      <div class="team-slot ${t1Selected ? 'selected' : ''}"
           data-team-id="${team1.id}" data-round="${round}" data-game="${gameNum}">
        <span class="seed">${team1.seed}</span>
        <span class="team-name">${esc(team1.short_name || team1.name)}</span>
      </div>` : `
      <div class="team-slot empty-slot">
        <span class="team-name">TBD</span>
      </div>`}
    ${team2 ? `
      <div class="team-slot ${t2Selected ? 'selected' : ''}"
           data-team-id="${team2.id}" data-round="${round}" data-game="${gameNum}">
        <span class="seed">${team2.seed}</span>
        <span class="team-name">${esc(team2.short_name || team2.name)}</span>
      </div>` : `
      <div class="team-slot empty-slot">
        <span class="team-name">TBD</span>
      </div>`}
  </div>`;
}

// Save bracket
$('#saveBracketBtn').addEventListener('click', async () => {
  const picks = Object.entries(bracketPicks).map(([key, teamId]) => {
    const [round, game_number] = key.split('-').map(Number);
    return { round, game_number, team_id: teamId };
  });

  try {
    await api('/api/picks', {
      method: 'POST',
      body: { bracket_id: currentBracketId, picks },
    });
    showToast('Bracket saved!');
  } catch (err) {
    showToast(err.message);
  }
});

$('#backBtn').addEventListener('click', () => {
  loadBrackets();
  showScreen('bracket');
  // Reset active nav
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $('.nav-btn[data-page="bracket"]').classList.add('active');
});

// ─── LEADERBOARD ──────────────────────────────────────────

async function loadLeaderboard() {
  try {
    const data = await api('/api/leaderboard');
    renderLeaderboard(data);
  } catch (err) {
    showToast('Error loading leaderboard');
  }
}

function renderLeaderboard(data) {
  const { leaderboard } = data;
  if (leaderboard.length === 0) {
    $('#leaderboardTable').innerHTML = '<div class="empty-state"><p>No brackets submitted yet. Be the first!</p></div>';
    return;
  }

  let html = `<table class="leaderboard">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Player</th>
        <th>Bracket</th>
        <th>Correct</th>
        <th>Points</th>
      </tr>
    </thead>
    <tbody>`;

  for (const entry of leaderboard) {
    const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';

    html += `<tr>
      <td><span class="rank-badge ${rankClass}">${medal || entry.rank}</span></td>
      <td style="font-weight:600;">${esc(entry.screen_name)}</td>
      <td>${esc(entry.bracket_name)}</td>
      <td>${entry.correct_picks}/${entry.total_picks}</td>
      <td><span class="points-big">${entry.total_points}</span></td>
    </tr>`;
  }

  html += '</tbody></table>';
  $('#leaderboardTable').innerHTML = html;
}

$('#refreshLeaderboard').addEventListener('click', loadLeaderboard);

// ─── TOURNAMENT RESULTS ───────────────────────────────────

async function loadTournamentResults() {
  try {
    const games = await api('/api/tournament');
    renderTournamentResults(games);
  } catch (err) {
    showToast('Error loading tournament data');
  }
}

function renderTournamentResults(games) {
  const completed = games.filter(g => g.status === 'final');
  const pending = games.filter(g => g.status === 'pending' && g.team1_name && g.team2_name);

  if (completed.length === 0 && pending.length === 0) {
    $('#tournamentResults').innerHTML = `<div class="empty-state">
      <span class="empty-icon">📡</span>
      <p>No tournament games scheduled yet. Check back when the tournament begins!</p>
    </div>`;
    return;
  }

  let html = '';

  if (completed.length > 0) {
    html += '<h3 style="grid-column:1/-1;font-family:var(--font-display);color:var(--green);margin-bottom:4px;">Completed Games</h3>';
    for (const g of completed) {
      const t1Winner = g.winner_id === g.team1_id;
      html += `<div class="result-card">
        <div class="round-label">${ROUND_NAMES[g.round] || 'Round ' + g.round} · Game ${g.game_number}</div>
        <div class="result-teams">
          <div class="result-team ${t1Winner ? 'is-winner' : ''}">
            <span>(${g.team1_seed}) ${esc(g.team1_short || g.team1_name)}</span>
            <span class="score">${g.team1_score ?? ''}</span>
          </div>
          <div class="result-team ${!t1Winner ? 'is-winner' : ''}">
            <span>(${g.team2_seed}) ${esc(g.team2_short || g.team2_name)}</span>
            <span class="score">${g.team2_score ?? ''}</span>
          </div>
        </div>
        <div class="result-status">Final</div>
      </div>`;
    }
  }

  if (pending.length > 0) {
    html += '<h3 style="grid-column:1/-1;font-family:var(--font-display);color:var(--text-dim);margin-top:12px;">Upcoming Games</h3>';
    for (const g of pending) {
      html += `<div class="result-card">
        <div class="round-label">${ROUND_NAMES[g.round] || 'Round ' + g.round}</div>
        <div class="result-teams">
          <div class="result-team">
            <span>(${g.team1_seed}) ${esc(g.team1_short || g.team1_name)}</span>
          </div>
          <div class="result-team">
            <span>(${g.team2_seed}) ${esc(g.team2_short || g.team2_name)}</span>
          </div>
        </div>
        <div class="result-status pending">Upcoming</div>
      </div>`;
    }
  }

  $('#tournamentResults').innerHTML = html;
}

// ─── MODAL ────────────────────────────────────────────────

$('#modalClose').addEventListener('click', hideModal);
$('.modal-backdrop').addEventListener('click', hideModal);

// ─── UTILITIES ────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── INIT ─────────────────────────────────────────────────

function init() {
  setupAuth();
  setupNav();

  // Check for saved session
  const saved = localStorage.getItem('mm_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      loginSuccess(user);
    } catch (e) {
      showScreen('auth');
    }
  } else {
    showScreen('auth');
  }
}

init();
