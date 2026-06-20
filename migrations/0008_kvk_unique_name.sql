-- KvK Unique Name + Slug-based URLs
-- Makes kvks.name UNIQUE for URL-friendly lookups

-- 1. Add UNIQUE constraint on name
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we recreate
CREATE TABLE IF NOT EXISTS kvks_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  active_version_id INTEGER REFERENCES data_versions(id),
  formula_type TEXT NOT NULL DEFAULT 'dkp',
  formula_params TEXT NOT NULL DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO kvks_new SELECT * FROM kvks;
DROP TABLE kvks;
ALTER TABLE kvks_new RENAME TO kvks;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_kvks_status ON kvks(status);
CREATE INDEX IF NOT EXISTS idx_kvks_slug ON kvks(slug);
