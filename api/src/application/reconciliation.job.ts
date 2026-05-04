// api/src/application/reconciliation.job.ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runReconciliation() {
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT account_id,
        COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END),0) as balance
      FROM ledger_entries
      GROUP BY account_id
    `);

    // Example: compare with external (mock)
    for (const row of res.rows) {
      const internalBalance = Number(row.balance);

      // Replace with real bank API check
      const externalBalance = internalBalance; 

      if (internalBalance !== externalBalance) {
        console.error('RECONCILIATION MISMATCH', {
          account: row.account_id,
          internalBalance,
          externalBalance
        });
      }
    }

    console.log('Reconciliation completed');
  } finally {
    client.release();
  }
}
