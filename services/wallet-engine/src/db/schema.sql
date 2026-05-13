CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_balances (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transfers (
  id UUID PRIMARY KEY,
  digest TEXT NOT NULL,
  chain TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_atomic TEXT NOT NULL,
  nonce BIGINT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_audit_log (
  id UUID PRIMARY KEY,
  actor TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wallet_balances
ADD COLUMN IF NOT EXISTS decimals INTEGER;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

ALTER TABLE wallet_transfers
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;
