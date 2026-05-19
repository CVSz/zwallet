import { Pool } from 'pg';

const pool = new Pool();

export async function reconcile() {
  const res = await pool.query(`
    SELECT account_id,
      SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END) as balance
    FROM entries
    GROUP BY account_id
  `);

  for (const row of res.rows) {
    if (row.balance < 0) {
      console.error('Reconciliation alert', row);
    }
  }
}
