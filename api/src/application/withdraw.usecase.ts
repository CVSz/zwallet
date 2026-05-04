// api/src/application/withdraw.usecase.ts
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function createWithdraw(userId: string, amount: number) {
  if (!userId || amount <= 0) throw new Error('Invalid input');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const balanceRes = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END),0) as balance
       FROM ledger_entries WHERE account_id=$1 FOR UPDATE`,
      [userId]
    );

    const balance = Number(balanceRes.rows[0].balance);

    if (balance < amount) throw new Error('Insufficient funds');

    const txId = crypto.randomUUID();

    await client.query(
      `INSERT INTO transactions (id, status) VALUES ($1,'pending')`,
      [txId]
    );

    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
       VALUES ($1,$2,$3,'debit')`,
      [txId, userId, amount]
    );

    await client.query('COMMIT');

    return { txId, status: 'pending' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
