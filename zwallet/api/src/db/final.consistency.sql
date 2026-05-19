-- api/src/db/final.consistency.sql

-- 1. Enforce non-negative balances at DB level
ALTER TABLE account_balance
ADD CONSTRAINT account_balance_non_negative CHECK (balance >= 0);

-- 2. Strict FK to prevent ghost accounts
ALTER TABLE ledger_entries
ADD CONSTRAINT fk_account_strict
FOREIGN KEY (account_id) REFERENCES ledger_accounts(id);

-- 3. CQRS HARD SYNC (trigger-based, eliminates drift)
CREATE OR REPLACE FUNCTION sync_balance_strict()
RETURNS trigger AS $$
BEGIN
  UPDATE account_balance
  SET balance = balance +
    CASE WHEN NEW.direction='credit' THEN NEW.amount ELSE -NEW.amount END
  WHERE account_id = NEW.account_id;

  IF NOT FOUND THEN
    INSERT INTO account_balance(account_id, balance)
    VALUES (
      NEW.account_id,
      CASE WHEN NEW.direction='credit' THEN NEW.amount ELSE -NEW.amount END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_balance_sync ON ledger_entries;
CREATE TRIGGER trg_balance_sync
AFTER INSERT ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION sync_balance_strict();

-- 4. Enforce immutability (hard guarantee)
REVOKE UPDATE, DELETE ON ledger_entries FROM PUBLIC;

-- 5. Outbox reliability fields
ALTER TABLE outbox
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dead_letter BOOLEAN DEFAULT FALSE;

-- 6. Prevent duplicate event processing (consumer idempotency)
CREATE TABLE IF NOT EXISTS consumer_idempotency (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT now()
);

-- 7. Reconciliation persistence (mandatory)
CREATE TABLE IF NOT EXISTS reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT,
  ledger_balance NUMERIC,
  cqrs_balance NUMERIC,
  external_balance NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

-- 8. Enforce zero-sum journal entries per transaction at commit time
CREATE OR REPLACE FUNCTION enforce_zero_sum_transaction()
RETURNS trigger AS $$
DECLARE
  tx_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN direction = 'credit' THEN amount ELSE -amount END
  ), 0)
  INTO tx_balance
  FROM ledger_entries
  WHERE transaction_id = NEW.transaction_id;

  IF tx_balance <> 0 THEN
    RAISE EXCEPTION 'Ledger transaction % is not balanced (net=%)', NEW.transaction_id, tx_balance;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_zero_sum_tx ON ledger_entries;
CREATE CONSTRAINT TRIGGER trg_enforce_zero_sum_tx
AFTER INSERT OR UPDATE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_zero_sum_transaction();
