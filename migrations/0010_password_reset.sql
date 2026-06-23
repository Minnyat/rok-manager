-- Password reset / one-time password support.
-- Two flows:
--   1. A manager (admin / King / R4) issues a one-time password for a member.
--      We set users.must_change_password = 1 so the member is forced to pick a
--      new password right after logging in with the temp one.
--   2. A logged-out member who forgot their password raises a request that is
--      routed to the admin and to the King/R4 of their (snapshotted) kingdom.

-- 1. Force-change flag, set whenever a one-time password is issued.
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

-- 2. Forgot-password requests raised from the public login page.
--    kingdom_id snapshots the requester's active kingdom so King/R4 can see it
--    (NULL = no active kingdom -> admin handles it).
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kingdom_id INTEGER REFERENCES kingdoms(id),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_by INTEGER REFERENCES users(id),
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_prr_kingdom ON password_reset_requests(kingdom_id, status);
CREATE INDEX IF NOT EXISTS idx_prr_user ON password_reset_requests(user_id, status);
