CREATE TABLE IF NOT EXISTS event_dedup (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now()
);
