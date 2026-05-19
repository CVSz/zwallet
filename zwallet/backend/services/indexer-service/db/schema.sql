CREATE TABLE IF NOT EXISTS indexer_jobs (
  id BIGSERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chain, idempotency_key)
);

CREATE TABLE IF NOT EXISTS processed_events (
  id BIGSERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chain, event_id)
);

CREATE TABLE IF NOT EXISTS address_balances (
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  asset TEXT NOT NULL,
  balance NUMERIC(78,0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chain, address, asset)
);

CREATE TABLE IF NOT EXISTS btc_utxos (
  txid TEXT NOT NULL,
  vout INTEGER NOT NULL,
  address TEXT NOT NULL,
  satoshis BIGINT NOT NULL,
  spent BOOLEAN NOT NULL DEFAULT FALSE,
  block_ref TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (txid, vout)
);

-- Queue messages can be inserted by your broker consumer and dequeued by the worker.
CREATE TABLE IF NOT EXISTS indexer_queue (
  id BIGSERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT,
  event_id TEXT,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);
