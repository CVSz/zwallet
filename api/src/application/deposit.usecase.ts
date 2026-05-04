// api/src/application/deposit.usecase.ts
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function createDeposit(userId: string, amount: number) {
  if (!userId || amount <= 0) throw new Error('Invalid input');

  const txId = crypto.randomUUID();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO transactions (id, status) VALUES ($1,'pending')`,
      [txId]
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

export async function confirmDeposit(txId: string, userId: string, amount: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tx = await client.query(
      `SELECT status FROM transactions WHERE id=$1 FOR UPDATE`,
      [txId]
    );

    if (!tx.rows.length) throw new Error('Transaction not found');
    if (tx.rows[0].status === 'completed') {
      await client.query('COMMIT');
      return { status: 'already_completed' };
    }

    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
       VALUES ($1,$2,$3,'credit')`,
      [txId, userId, amount]
    );

    await client.query(
      `UPDATE transactions SET status='completed' WHERE id=$1`,
      [txId]
    );

    await client.query('COMMIT');

    return { status: 'completed' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
