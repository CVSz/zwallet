import { Pool } from 'pg';

const pool = new Pool();

export async function runClearing(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT id FROM transactions
      WHERE status='completed'
      ORDER BY created_at
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `);

    for (const row of res.rows) {
      await client.query(
        `UPDATE transactions SET status='clearing' WHERE id=$1`,
        [row.id]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
