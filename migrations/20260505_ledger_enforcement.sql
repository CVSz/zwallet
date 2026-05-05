-- deterministic ledger enforcement
CREATE OR REPLACE FUNCTION enforce_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount),0)
  INTO total
  FROM ledger_entries
  WHERE transaction_id = NEW.transaction_id;

  IF total != 0 THEN
    RAISE EXCEPTION 'Ledger imbalance detected for transaction %', NEW.transaction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_balance_trigger ON ledger_entries;
CREATE CONSTRAINT TRIGGER ledger_balance_trigger
AFTER INSERT OR UPDATE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_transaction_balance();
