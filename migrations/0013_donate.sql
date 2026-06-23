-- Donate / Support configuration
-- Admins can configure multiple payment methods (bank transfer, e-wallets, etc.)
-- with QR codes and account details for display on the public /donate page.

CREATE TABLE IF NOT EXISTS donate_methods (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,              -- display name, e.g. "MB Bank"
  type           TEXT    NOT NULL DEFAULT 'bank', -- 'bank' | 'ewallet' | 'other'
  account_number TEXT,                          -- bank account or phone number
  account_name   TEXT,                          -- account holder name
  bank_name      TEXT,                          -- bank / wallet brand name
  description    TEXT,                          -- optional extra notes shown to donors
  qr_data        TEXT,                          -- base64 data URI or external image URL
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
