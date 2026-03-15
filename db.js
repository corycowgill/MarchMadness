const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'marchmadness.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screen_name TEXT UNIQUE NOT NULL,
    key_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    seed INTEGER NOT NULL,
    region TEXT NOT NULL,
    short_name TEXT,
    eliminated INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER NOT NULL,
    game_number INTEGER NOT NULL,
    region TEXT,
    team1_id INTEGER REFERENCES teams(id),
    team2_id INTEGER REFERENCES teams(id),
    winner_id INTEGER REFERENCES teams(id),
    team1_score INTEGER,
    team2_score INTEGER,
    status TEXT DEFAULT 'pending',
    game_date TEXT,
    UNIQUE(round, game_number)
  );

  CREATE TABLE IF NOT EXISTS brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bracket_id INTEGER NOT NULL REFERENCES brackets(id),
    round INTEGER NOT NULL,
    game_number INTEGER NOT NULL,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    UNIQUE(bracket_id, round, game_number)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Insert default settings if not present
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('brackets_locked', '0');
insertSetting.run('tournament_year', '2026');

module.exports = db;
