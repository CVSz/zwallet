import { Pool } from 'pg';

const pool = new Pool();

export async function settleTransactions() {
  const res = await pool.query(`
    SELECT id FROM transactions WHERE status='completed'
  `);

  for (const row of res.rows) {
    await pool.query(
      `UPDATE transactions SET status='settled' WHERE id=$1`,
      [row.id]
    );
  }
}
