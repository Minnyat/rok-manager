-- KvK Unique Name + Slug-based URLs
-- Makes kvks.name UNIQUE for URL-friendly lookups.
--
-- NOTE: This originally rebuilt the `kvks` table (CREATE kvks_new / copy / DROP /
-- RENAME) to add a table-level UNIQUE(name). That pattern is unsafe once child
-- tables hold rows: dropping `kvks` leaves deferred FK violations whose counter a
-- RENAME does not clear, so COMMIT fails ("FOREIGN KEY constraint failed"). A
-- UNIQUE INDEX gives the exact same guarantee without touching the table or its
-- foreign keys, so we use that instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kvks_name_unique ON kvks(name);

-- Keep the supporting lookup indexes.
CREATE INDEX IF NOT EXISTS idx_kvks_status ON kvks(status);
CREATE INDEX IF NOT EXISTS idx_kvks_slug ON kvks(slug);
