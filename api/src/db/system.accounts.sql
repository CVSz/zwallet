-- api/src/db/system.accounts.sql

-- System accounts for double-entry
INSERT INTO ledger_accounts (id, type)
VALUES
  ('SYSTEM_BANK', 'system'),
  ('SYSTEM_FEE', 'system')
ON CONFLICT DO NOTHING;

-- Ensure accounts table exists
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('user','system')),
  created_at TIMESTAMP DEFAULT now()
);
