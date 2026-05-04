-- api/src/db/schema.sql

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  account_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  direction TEXT CHECK (direction IN ('debit','credit')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_tx ON ledger_entries(transaction_id);
