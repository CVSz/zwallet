#!/usr/bin/env bash
set -euo pipefail

DB_URL=${DATABASE_URL:?"DATABASE_URL required"}

rollback_ledger() {
  psql "$DB_URL" -c "DROP TRIGGER IF EXISTS ledger_balance_trigger ON ledger_entries;"
  psql "$DB_URL" -c "DROP FUNCTION IF EXISTS enforce_transaction_balance();"
}

rollback_idempotency() {
  psql "$DB_URL" -c "DROP TABLE IF EXISTS event_dedup;"
}

rollback_ledger
rollback_idempotency

echo "Rollback completed successfully"
