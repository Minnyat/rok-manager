-- KvK Scoring Config and Bonus Recipients
-- Creates per-KvK scoring config, bonus recipients, and adds breakdown columns to player_scores

-- 1. Create kvk_scoring_config table
CREATE TABLE IF NOT EXISTS kvk_scoring_config (
  kvk_id INTEGER NOT NULL REFERENCES kvks(id),
  key TEXT NOT NULL,
  value REAL NOT NULL,
  label TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (kvk_id, key)
);

-- 2. Create kvk_bonus_recipients table
CREATE TABLE IF NOT EXISTS kvk_bonus_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kvk_id INTEGER NOT NULL REFERENCES kvks(id),
  governor_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  bonus_pct REAL NOT NULL CHECK (bonus_pct >= -100 AND bonus_pct <= 100),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(kvk_id, governor_id)
);

CREATE INDEX IF NOT EXISTS idx_kvk_bonus_kvk ON kvk_bonus_recipients(kvk_id);
CREATE INDEX IF NOT EXISTS idx_kvk_bonus_governor ON kvk_bonus_recipients(governor_id);

-- 3. Add breakdown columns to player_scores
ALTER TABLE player_scores ADD COLUMN dkp_base REAL NOT NULL DEFAULT 0;
ALTER TABLE player_scores ADD COLUMN bonus_pct REAL NOT NULL DEFAULT 0;
ALTER TABLE player_scores ADD COLUMN bonus_amount REAL NOT NULL DEFAULT 0;

-- 4. Backfill scoring_config from global to Legacy KvK
INSERT INTO kvk_scoring_config (kvk_id, key, value, label, updated_at)
SELECT k.id, s.key, s.value, s.label, s.updated_at
FROM kvks k
CROSS JOIN scoring_config s
WHERE k.slug = 'legacy-current';

-- 5. Backfill bonus from users.dkp_bonus_pct to Legacy KvK
-- Note: dkp_bonus_pct != 0 includes negative values (penalties)
INSERT INTO kvk_bonus_recipients (kvk_id, governor_id, user_id, bonus_pct, note, created_at, updated_at)
SELECT k.id, u.main_governor_id, u.id, u.dkp_bonus_pct, 'Backfilled from users.dkp_bonus_pct', unixepoch(), unixepoch()
FROM users u
CROSS JOIN kvks k
WHERE k.slug = 'legacy-current'
  AND u.dkp_bonus_pct != 0
  AND u.main_governor_id > 0;
