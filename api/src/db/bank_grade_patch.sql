-- api/src/db/bank_grade_patch.sql

-- 1. Enforce SERIALIZABLE isolation via function wrapper
CREATE OR REPLACE FUNCTION begin_serializable()
RETURNS void AS $$
BEGIN
  PERFORM set_config('transaction_isolation', 'serializable', true);
END;
$$ LANGUAGE plpgsql;

-- 2. Lock ledger table (no direct writes)
REVOKE INSERT, UPDATE, DELETE ON ledger_entries FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON ledger_entries FROM postgres;

-- 3. Create dedicated role for ledger writes
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledger_writer') THEN
    CREATE ROLE ledger_writer NOLOGIN;
  END IF;
END $$;

GRANT INSERT ON ledger_entries TO ledger_writer;

-- 4. Secure insert function (only entry point)
CREATE OR REPLACE FUNCTION secure_ledger_post(
  p_tx_id UUID,
  p_debit TEXT,
  p_credit TEXT,
  p_amount NUMERIC
)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
  VALUES
    (p_tx_id, p_debit, p_amount, 'debit'),
    (p_tx_id, p_credit, p_amount, 'credit');
END;
$$ LANGUAGE plpgsql;

-- 5. Enforce immutability
REVOKE UPDATE, DELETE ON ledger_entries FROM PUBLIC;

-- 6. Add reconciliation issues table
CREATE TABLE IF NOT EXISTS reconciliation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT,
  internal_balance NUMERIC,
  external_balance NUMERIC,
  detected_at TIMESTAMP DEFAULT now()
);

-- 7. Add webhook idempotency table
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  payload JSONB,
  processed_at TIMESTAMP DEFAULT now()
);

-- 8. Add consumer idempotency table
CREATE TABLE IF NOT EXISTS consumer_offsets (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT now()
);
