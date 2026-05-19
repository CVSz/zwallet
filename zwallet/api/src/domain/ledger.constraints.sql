-- Enforce strict double-entry invariant (sum must be zero per transaction)
ALTER TABLE ledger_entries
ADD CONSTRAINT ledger_balance_check
CHECK (
  (SELECT COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END),0)
   FROM ledger_entries le
   WHERE le.transaction_id = ledger_entries.transaction_id) = 0
);

-- Enforce append-only (no updates/deletes)
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_no_update
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
