-- KvK Account Links
-- Creates per-KvK account links table

CREATE TABLE IF NOT EXISTS kvk_account_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kvk_id INTEGER NOT NULL REFERENCES kvks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER NOT NULL,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by INTEGER REFERENCES users(id),
  UNIQUE(kvk_id, governor_id),
  UNIQUE(kvk_id, user_id, governor_id)
);

CREATE INDEX IF NOT EXISTS idx_kvk_account_links_user ON kvk_account_links(kvk_id, user_id);
CREATE INDEX IF NOT EXISTS idx_kvk_account_links_governor ON kvk_account_links(kvk_id, governor_id);

-- Backfill from global account_links to Legacy KvK
INSERT INTO kvk_account_links (kvk_id, user_id, governor_id, linked_at)
SELECT k.id, al.user_id, al.governor_id, al.linked_at
FROM account_links al
CROSS JOIN kvks k
WHERE k.slug = 'legacy-current';
