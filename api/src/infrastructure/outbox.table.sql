-- api/src/infrastructure/outbox.table.sql

CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_outbox_status ON outbox(status);
