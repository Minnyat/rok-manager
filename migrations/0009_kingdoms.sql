-- Kingdom Layer: multi-tenant restructure
-- Adds Kingdom as the top tier above KvK. A Kingdom owns its KvKs and members.
-- Hierarchy inside a kingdom: King > R4 > member.
-- Existing data is migrated into one default Kingdom number '0000'.

-- 1. Kingdoms (the tenant). `number` is the 4-digit game kingdom number (xxxx).
CREATE TABLE IF NOT EXISTS kingdoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,                  -- "xxxx" (TEXT preserves leading zeros)
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  king_user_id INTEGER REFERENCES users(id),
  storage_quota_mb INTEGER NOT NULL DEFAULT 100,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_kingdoms_status ON kingdoms(status);

-- 2. Kingdom membership + kingdom-scoped role + active/frozen state.
-- Invariant (enforced in app code): a user has at most ONE 'active' membership
-- across all kingdoms. Previous memberships stay 'frozen' (preserved, read-only).
CREATE TABLE IF NOT EXISTS kingdom_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kingdom_id INTEGER NOT NULL REFERENCES kingdoms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('king', 'r4', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  frozen_at INTEGER,
  invited_by INTEGER REFERENCES users(id),
  UNIQUE(kingdom_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_km_kingdom ON kingdom_members(kingdom_id, status);
CREATE INDEX IF NOT EXISTS idx_km_user ON kingdom_members(user_id, status);

-- 3. Move / join handshake (both directions).
--    initiated_by = 'member' -> join request; 'king' -> invite to join.
CREATE TABLE IF NOT EXISTS kingdom_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER NOT NULL,
  from_kingdom_id INTEGER REFERENCES kingdoms(id),
  to_kingdom_id INTEGER NOT NULL REFERENCES kingdoms(id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('member', 'king')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('r4', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_by INTEGER REFERENCES users(id),
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_kt_to ON kingdom_transfers(to_kingdom_id, status);
CREATE INDEX IF NOT EXISTS idx_kt_user ON kingdom_transfers(user_id, status);

-- 4. KvK -> Kingdom link.
ALTER TABLE kvks ADD COLUMN kingdom_id INTEGER REFERENCES kingdoms(id);
CREATE INDEX IF NOT EXISTS idx_kvks_kingdom ON kvks(kingdom_id);

-- 5. Storage accounting: bytes of the imported CSV per data version.
ALTER TABLE data_versions ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0;

-- 6. Account-creation invite now carries its target kingdom + kingdom role.
ALTER TABLE users ADD COLUMN invite_kingdom_id INTEGER REFERENCES kingdoms(id);
ALTER TABLE users ADD COLUMN invite_kingdom_role TEXT;       -- 'king' | 'r4' | 'member'

-- ---- Data migration: gather existing data into default Kingdom '0000' ----

-- 7. Create the default kingdom.
INSERT OR IGNORE INTO kingdoms (number, display_name, status, storage_quota_mb, created_at, updated_at)
VALUES ('0000', 'Legacy / Default', 'active', 100, unixepoch(), unixepoch());

-- 8. Assign every existing KvK to the default kingdom.
UPDATE kvks
SET kingdom_id = (SELECT id FROM kingdoms WHERE number = '0000')
WHERE kingdom_id IS NULL;

-- 9. Create active memberships for every existing active, non-admin user.
--    Kings keep 'king'; everyone else becomes 'member'. Admins are system-level
--    (no membership). main_governor_id = 0 is the admin placeholder, so skip it.
INSERT INTO kingdom_members (kingdom_id, user_id, governor_id, role, status, joined_at)
SELECT
  (SELECT id FROM kingdoms WHERE number = '0000'),
  u.id,
  u.main_governor_id,
  CASE WHEN u.role = 'king' THEN 'king' ELSE 'member' END,
  'active',
  unixepoch()
FROM users u
WHERE u.is_active = 1
  AND u.role != 'admin'
  AND u.main_governor_id > 0;

-- 10. Point the default kingdom at its first King (if any).
UPDATE kingdoms
SET king_user_id = (
  SELECT user_id FROM kingdom_members
  WHERE kingdom_id = kingdoms.id AND role = 'king'
  ORDER BY user_id LIMIT 1
)
WHERE number = '0000';

-- 11. Estimate historical storage usage (real CSV bytes are recorded from new
--     imports onward). ~150 bytes/row is a rough average for the wide CSV schema.
UPDATE data_versions SET size_bytes = row_count * 150 WHERE size_bytes = 0;
