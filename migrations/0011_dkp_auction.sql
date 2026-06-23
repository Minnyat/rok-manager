-- DKP Auction (MGE) Layer
-- Adds a per-kingdom "coin" wallet (an immutable ledger) funded by converting a
-- player's KvK DKP, plus a Generalized Second-Price (GSP) auction over MGE rank
-- slots 1..15. See docs/dkp-auction-process.md and docs/dkp-auction-implementation-plan.md.
--
-- Money invariant: a wallet balance is NEVER stored as a mutable counter. It is
-- always SUM(dkp_ledger.amount) for (kingdom_id, user_id). Every grant, decay,
-- charge, refund and adjustment is one immutable ledger row.

-- 1. Fixed reward table: how many sculptures ("trọc") each MGE rank grants.
--    System-wide, configured once by an admin; every kingdom shares it.
CREATE TABLE IF NOT EXISTS mge_rank_rewards (
  rank       INTEGER PRIMARY KEY CHECK (rank BETWEEN 1 AND 15),
  sculptures INTEGER NOT NULL CHECK (sculptures >= 0)
);

-- Default values follow the standard MGE individual-reward table.
INSERT OR IGNORE INTO mge_rank_rewards (rank, sculptures) VALUES
  (1, 180), (2, 90), (3, 60), (4, 50), (5, 40), (6, 30),
  (7, 20), (8, 20), (9, 20), (10, 20),
  (11, 10), (12, 10), (13, 10), (14, 10), (15, 10);

-- 2. DKP -> coin conversion, finalized once per (kingdom, KvK).
--    The UNIQUE constraint is the idempotency guard for "chốt 1 lần mỗi KvK".
CREATE TABLE IF NOT EXISTS dkp_conversions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kingdom_id   INTEGER NOT NULL REFERENCES kingdoms(id),
  kvk_id       INTEGER NOT NULL REFERENCES kvks(id),
  rate         INTEGER NOT NULL DEFAULT 1,                 -- coins per DKP (1:1)
  keep_pct     INTEGER NOT NULL DEFAULT 100 CHECK (keep_pct BETWEEN 0 AND 100),
  converted_by INTEGER REFERENCES users(id),
  converted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (kingdom_id, kvk_id)
);

-- 3. Auctions. At most ONE "live" (draft|open|closed) auction per kingdom.
--    Auctions are kingdom-level. kvk_id is an OPTIONAL reference KvK, used only
--    for the DKP tiebreak (and ledger labeling) — not a hard dependency.
CREATE TABLE IF NOT EXISTS auctions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  kingdom_id         INTEGER NOT NULL REFERENCES kingdoms(id),
  kvk_id             INTEGER REFERENCES kvks(id),
  title              TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'open', 'closed', 'settled', 'cancelled')),
  increment          INTEGER NOT NULL DEFAULT 1 CHECK (increment >= 1),
  reserve            INTEGER NOT NULL DEFAULT 1 CHECK (reserve >= 0),
  max_rank           INTEGER NOT NULL DEFAULT 15 CHECK (max_rank BETWEEN 1 AND 15),
  opens_at           INTEGER NOT NULL,                     -- UTC epoch seconds
  closes_at          INTEGER NOT NULL,                     -- UTC epoch (after soft-close extensions)
  original_closes_at INTEGER NOT NULL,                     -- UTC epoch (as first scheduled)
  soft_close_minutes INTEGER NOT NULL DEFAULT 5 CHECK (soft_close_minutes >= 0),
  created_by         INTEGER REFERENCES users(id),
  settled_by         INTEGER REFERENCES users(id),
  settled_at         INTEGER,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_auctions_kingdom ON auctions(kingdom_id, status);
-- Only one non-terminal auction may exist per kingdom at a time.
CREATE UNIQUE INDEX IF NOT EXISTS ux_auction_one_live
  ON auctions(kingdom_id) WHERE status IN ('draft', 'open', 'closed');

-- 4. Bids: append-only. Each raise inserts a new row; a player's current bid is
--    the highest/latest row for that (auction, user). Never updated in place.
CREATE TABLE IF NOT EXISTS auction_bids (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id  INTEGER NOT NULL REFERENCES auctions(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,
  unit_price  INTEGER NOT NULL CHECK (unit_price > 0),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON auction_bids(auction_id, user_id, id);

-- 5. Settled results (one row per winner). Cancel/adjust update this row AND post
--    a matching ledger entry — money state always reconciles to the ledger.
CREATE TABLE IF NOT EXISTS auction_results (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id  INTEGER NOT NULL REFERENCES auctions(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,
  rank        INTEGER NOT NULL,
  sculptures  INTEGER NOT NULL,
  unit_paid   INTEGER NOT NULL,
  total_cost  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_results_auction ON auction_results(auction_id);

-- 6. Immutable coin ledger. balance(kingdom,user) = SUM(amount).
--    entry_type: grant | decay | charge | refund | adjust   (amount is signed)
CREATE TABLE IF NOT EXISTS dkp_ledger (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kingdom_id  INTEGER NOT NULL REFERENCES kingdoms(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  governor_id INTEGER,
  kvk_id      INTEGER REFERENCES kvks(id),
  entry_type  TEXT NOT NULL
                CHECK (entry_type IN ('grant', 'decay', 'charge', 'refund', 'adjust')),
  amount      INTEGER NOT NULL,
  auction_id  INTEGER REFERENCES auctions(id),
  result_id   INTEGER REFERENCES auction_results(id),
  reason      TEXT,                                        -- required (app-enforced) for refund/adjust
  created_by  INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON dkp_ledger(kingdom_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_auction ON dkp_ledger(auction_id);
-- A KvK conversion may grant/decay each user at most once (idempotent conversion).
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_grant_once
  ON dkp_ledger(kvk_id, user_id) WHERE entry_type = 'grant';
CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_decay_once
  ON dkp_ledger(kvk_id, user_id) WHERE entry_type = 'decay';

-- 7. Audit log of King/R4 administrative actions (public after auction close).
CREATE TABLE IF NOT EXISTS auction_audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id     INTEGER REFERENCES auctions(id),
  kingdom_id     INTEGER NOT NULL,
  actor_user_id  INTEGER REFERENCES users(id),
  action         TEXT NOT NULL,   -- convert|create|open|close|settle|cancel_result|adjust_result
  target_user_id INTEGER,
  detail_json    TEXT,            -- {"before":..., "after":...}
  reason         TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_auction ON auction_audit_log(auction_id);
CREATE INDEX IF NOT EXISTS idx_audit_kingdom ON auction_audit_log(kingdom_id);
