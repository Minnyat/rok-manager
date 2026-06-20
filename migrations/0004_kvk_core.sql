-- KvK Core Schema
-- Creates kvks table and adds kvk_id to data_versions

-- 1. Create kvks table
CREATE TABLE IF NOT EXISTS kvks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  active_version_id INTEGER REFERENCES data_versions(id),
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_kvks_status ON kvks(status);

-- 2. Add kvk_id to data_versions
ALTER TABLE data_versions ADD COLUMN kvk_id INTEGER REFERENCES kvks(id);

CREATE INDEX IF NOT EXISTS idx_data_versions_kvk ON data_versions(kvk_id, imported_at);

-- 3. Create default Legacy KvK (active_version_id = NULL first to avoid FK cycle)
INSERT INTO kvks (name, slug, status, description, created_at, updated_at)
VALUES ('Legacy / Current KvK', 'legacy-current', 'active', 'KvK mặc định - dữ liệu được backfill từ hệ thống cũ', unixepoch(), unixepoch());

-- 4. Backfill all existing versions into default KvK
UPDATE data_versions
SET kvk_id = (SELECT id FROM kvks WHERE slug = 'legacy-current')
WHERE kvk_id IS NULL;

-- 5. Set active_version_id from current global active version
UPDATE kvks
SET active_version_id = (
  SELECT id FROM data_versions WHERE is_active = 1 LIMIT 1
)
WHERE slug = 'legacy-current';
