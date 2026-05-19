import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis();
const pool = new Pool();

export type Entry = {
  accountId: string;
  amount: number;
  direction: 'debit' | 'credit';
};

export async function executeTransaction(entries: Entry[], idempotencyKey: string) {
  if (!idempotencyKey) throw new Error('Missing idempotency key');

  const lockKey = `lock:tx:${idempotencyKey}`;
  const lock = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (!lock) {
    throw new Error('Duplicate or concurrent transaction');
  }

  const sum = entries.reduce((acc, e) => acc + (e.direction === 'debit' ? e.amount : -e.amount), 0);
  if (sum !== 0) {
    throw new Error('Unbalanced transaction');
  }

  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    const txId = uuidv4();

    await client.query(
      'INSERT INTO transactions (id, status) VALUES ($1, $2)',
      [txId, 'pending']
    );

    for (const e of entries) {
      await client.query(
        'INSERT INTO entries (id, transaction_id, account_id, amount, direction) VALUES ($1,$2,$3,$4,$5)',
        [uuidv4(), txId, e.accountId, e.amount, e.direction]
      );
    }

    await client.query(
      'UPDATE transactions SET status=$1 WHERE id=$2',
      ['completed', txId]
    );

    await client.query('COMMIT');

    return { txId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
