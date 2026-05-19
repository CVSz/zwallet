-- api/src/db/schema.sql

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('user','system')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  direction TEXT CHECK (direction IN ('debit','credit')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_balance (
  account_id TEXT PRIMARY KEY REFERENCES ledger_accounts(id),
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_ledger_invariant()
RETURNS trigger AS $$
DECLARE
  tx_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
  INTO tx_balance
  FROM ledger_entries
  WHERE transaction_id = NEW.transaction_id;

  IF tx_balance <> 0 THEN
    RAISE EXCEPTION 'Ledger invariant violation for tx % (net=%)', NEW.transaction_id, tx_balance;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_ledger_invariant ON ledger_entries;
CREATE CONSTRAINT TRIGGER trg_enforce_ledger_invariant
AFTER INSERT OR UPDATE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_ledger_invariant();

CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);
