CREATE TABLE IF NOT EXISTS wallet_signing_keys (
  id UUID PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_signing_audit_log (
  id UUID PRIMARY KEY,
  transfer_id UUID,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_ref TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
