CREATE TABLE IF NOT EXISTS wallet_nonces (
  address TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  next_nonce BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_pending_transactions (
  transfer_id UUID PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  chain TEXT NOT NULL,
  nonce BIGINT NOT NULL,
  status TEXT NOT NULL,
  last_checked_block BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
