CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'king', 'player')),
  main_governor_id INTEGER NOT NULL,
  invite_token TEXT UNIQUE,
  invite_expires_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS account_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER NOT NULL,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(governor_id)
);

CREATE TABLE IF NOT EXISTS data_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  imported_by INTEGER NOT NULL REFERENCES users(id),
  imported_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS player_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id INTEGER NOT NULL REFERENCES data_versions(id),
  ranking INTEGER NOT NULL,
  governor_id INTEGER NOT NULL,
  governor_name TEXT NOT NULL,
  camp TEXT,
  kd INTEGER,
  power INTEGER NOT NULL DEFAULT 0,
  power_diff INTEGER NOT NULL DEFAULT 0,
  kp INTEGER NOT NULL DEFAULT 0,
  t4 INTEGER NOT NULL DEFAULT 0,
  t5 INTEGER NOT NULL DEFAULT 0,
  dead INTEGER NOT NULL DEFAULT 0,
  acclaim INTEGER NOT NULL DEFAULT 0,
  healed INTEGER NOT NULL DEFAULT 0,
  dead_t1 INTEGER NOT NULL DEFAULT 0,
  dead_t2 INTEGER NOT NULL DEFAULT 0,
  dead_t3 INTEGER NOT NULL DEFAULT 0,
  dead_t4 INTEGER NOT NULL DEFAULT 0,
  dead_t5 INTEGER NOT NULL DEFAULT 0,
  dkp INTEGER NOT NULL DEFAULT 0,
  trades REAL,
  credit_score REAL,
  kill_points INTEGER NOT NULL DEFAULT 0,
  death_points INTEGER NOT NULL DEFAULT 0,
  heal_points INTEGER NOT NULL DEFAULT 0,
  feeding_rate REAL
);

CREATE TABLE IF NOT EXISTS player_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id INTEGER NOT NULL REFERENCES data_versions(id),
  governor_id INTEGER NOT NULL,
  dkp_raw REAL NOT NULL DEFAULT 0,
  dkp_combined REAL NOT NULL DEFAULT 0,
  rank_individual INTEGER,
  rank_combined INTEGER,
  farm_contribution REAL NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(version_id, governor_id)
);

CREATE TABLE IF NOT EXISTS scoring_config (
  key TEXT PRIMARY KEY,
  value REAL NOT NULL,
  label TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS account_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_user_id INTEGER NOT NULL REFERENCES users(id),
  disputed_governor_id INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_player_data_version ON player_data(version_id);
CREATE INDEX IF NOT EXISTS idx_player_data_governor ON player_data(governor_id);
CREATE INDEX IF NOT EXISTS idx_player_data_version_governor ON player_data(version_id, governor_id);
CREATE INDEX IF NOT EXISTS idx_account_links_user ON account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_governor ON account_links(governor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_governor ON users(main_governor_id);
CREATE INDEX IF NOT EXISTS idx_player_scores_version ON player_scores(version_id);

-- Seed scoring config defaults
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES ('t4_kill_weight', 1, 'T4 Kill Weight');
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES ('t5_kill_weight', 3, 'T5 Kill Weight');
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES ('dead_t4_weight', 2, 'Dead T4 Weight');
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES ('dead_t5_weight', 4, 'Dead T5 Weight');
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES ('farm_contribution_pct', 40, 'Farm Contribution %');
