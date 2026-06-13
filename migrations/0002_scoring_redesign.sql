-- Scoring config (key-value, admin-editable)
CREATE TABLE IF NOT EXISTS scoring_config (
  key TEXT PRIMARY KEY,
  value REAL NOT NULL,
  label TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Default config values
INSERT OR IGNORE INTO scoring_config (key, value, label) VALUES
  ('t4_weight', 1, 'T4 Kill Weight'),
  ('t5_weight', 3, 'T5 Kill Weight'),
  ('death_weight', 2, 'Death Weight'),
  ('farm_contribution_pct', 40, 'Farm Contribution %');

-- Rebuild player_scores with DKP fields
DROP TABLE IF EXISTS player_scores;
CREATE TABLE player_scores (
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
CREATE INDEX IF NOT EXISTS idx_player_scores_version ON player_scores(version_id);
