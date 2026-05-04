CREATE TABLE IF NOT EXISTS liquidity (
  currency TEXT PRIMARY KEY,
  available NUMERIC NOT NULL,
  reserved NUMERIC NOT NULL
);
