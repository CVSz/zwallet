#!/usr/bin/env bash
set -euo pipefail

DB_URL=${DATABASE_URL:?"DATABASE_URL required"}

apply() {
  file=$1
  echo "Applying $file"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
}

apply migrations/20260505_ledger_enforcement.sql
apply migrations/20260505_idempotency.sql

echo "Migrations applied successfully"
