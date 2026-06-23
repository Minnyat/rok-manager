-- Kingdom-level coin carryover setting.
-- When a KvK is CLOSED, its DKP is auto-converted to coins. coin_keep_pct is the
-- percentage of each member's existing coin balance to keep at that moment
-- (default 100% = keep everything, then add the new grant on top).
ALTER TABLE kingdoms ADD COLUMN coin_keep_pct INTEGER NOT NULL DEFAULT 100;
