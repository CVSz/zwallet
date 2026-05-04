// api/src/application/transfer.usecase.ts
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function transfer(from: string, to: string, amount: number, idempotencyKey: string) {
  if (!from || !to || amount <= 0) {
    throw new Error('Invalid input');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Idempotency check
    const idem = await client.query(
      'SELECT response FROM idempotency_keys WHERE key=$1 FOR UPDATE',
      [idempotencyKey]
    );

    if (idem.rows.length > 0) {
      await client.query('COMMIT');
      return idem.rows[0].response;
    }

    // Lock sender account
    const balanceRes = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END),0) as balance
       FROM ledger_entries WHERE account_id=$1 FOR UPDATE`,
      [from]
    );

    const balance = Number(balanceRes.rows[0].balance);

    if (balance < amount) {
      throw new Error('Insufficient funds');
    }

    const txId = crypto.randomUUID();

    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
       VALUES ($1,$2,$3,'debit'), ($1,$4,$3,'credit')`,
      [txId, from, amount, to]
    );

    const response = { txId, status: 'completed' };

    await client.query(
      'INSERT INTO idempotency_keys (key, response) VALUES ($1,$2)',
      [idempotencyKey, JSON.stringify(response)]
    );

    await client.query('COMMIT');

    return response;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
