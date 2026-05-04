// api/src/application/payment.lifecycle.ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function markWithdrawSent(txId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tx = await client.query(
      `SELECT status FROM transactions WHERE id=$1 FOR UPDATE`,
      [txId]
    );

    if (!tx.rows.length) throw new Error('Transaction not found');
    if (tx.rows[0].status !== 'pending') throw new Error('Invalid state');

    await client.query(
      `UPDATE transactions SET status='sent' WHERE id=$1`,
      [txId]
    );

    await client.query(
      `INSERT INTO outbox (id, topic, payload)
       VALUES (gen_random_uuid(), 'withdraw.sent', $1)`,
      [JSON.stringify({ txId })]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function markWithdrawFailed(txId: string, userId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tx = await client.query(
      `SELECT status FROM transactions WHERE id=$1 FOR UPDATE`,
      [txId]
    );

    if (!tx.rows.length) throw new Error('Transaction not found');
    if (tx.rows[0].status !== 'sent') throw new Error('Invalid state');

    // reverse ledger
    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
       VALUES ($1,$2,$3,'credit')`,
      [txId, userId, amount]
    );

    await client.query(
      `UPDATE transactions SET status='failed' WHERE id=$1`,
      [txId]
    );

    await client.query(
      `INSERT INTO outbox (id, topic, payload)
       VALUES (gen_random_uuid(), 'withdraw.failed', $1)`,
      [JSON.stringify({ txId })]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function markWithdrawSettled(txId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tx = await client.query(
      `SELECT status FROM transactions WHERE id=$1 FOR UPDATE`,
      [txId]
    );

    if (!tx.rows.length) throw new Error('Transaction not found');
    if (tx.rows[0].status !== 'sent') throw new Error('Invalid state');

    await client.query(
      `UPDATE transactions SET status='settled' WHERE id=$1`,
      [txId]
    );

    await client.query(
      `INSERT INTO outbox (id, topic, payload)
       VALUES (gen_random_uuid(), 'withdraw.settled', $1)`,
      [JSON.stringify({ txId })]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
