import { Pool } from 'pg';

const pool = new Pool();

export async function saveOutboxEvent(client: Pool, event: any) {
  await client.query(
    `INSERT INTO outbox (id, topic, payload, status, created_at)
     VALUES ($1, $2, $3, 'pending', now())`,
    [event.id, event.topic, JSON.stringify(event.payload)]
  );
}

export async function fetchPendingEvents(limit = 100) {
  const res = await pool.query(
    `SELECT * FROM outbox WHERE status='pending' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function markEventProcessed(id: string) {
  await pool.query(`UPDATE outbox SET status='processed' WHERE id=$1`, [id]);
}
