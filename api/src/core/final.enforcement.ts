// api/src/core/final.enforcement.ts
import { Pool, PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Global SERIALIZABLE transaction wrapper with retry
 */
export async function withSerializableTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  for (let i = 0; i < 5; i++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await client.query('SET LOCAL statement_timeout = 5000');

      const result = await fn(client);

      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      await client.query('ROLLBACK');

      if (err.code === '40001') {
        // serialization failure → retry
        continue;
      }

      throw err;
    } finally {
      client.release();
    }
  }

  throw new Error('Max retry exceeded (SERIALIZABLE)');
}

/**
 * CQRS Balance Update (must be called inside same tx)
 */
export async function updateBalance(
  client: PoolClient,
  accountId: string,
  delta: number
) {
  if (!accountId) throw new Error('Invalid account');

  await client.query(
    `INSERT INTO account_balance (account_id, balance)
     VALUES ($1, $2)
     ON CONFLICT (account_id)
     DO UPDATE SET balance = account_balance.balance + $2`,
    [accountId, delta]
  );
}

/**
 * Secure double-entry + CQRS sync (single entry point)
 */
export async function postTransaction(params: {
  debit: string;
  credit: string;
  amount: number;
}) {
  return withSerializableTx(async (client) => {
    const { debit, credit, amount } = params;

    if (!debit || !credit || amount <= 0) {
      throw new Error('Invalid transaction');
    }

    const txIdRes = await client.query(`SELECT gen_random_uuid() as id`);
    const txId = txIdRes.rows[0].id;

    // enforce sufficient balance
    const bal = await client.query(
      `SELECT balance FROM account_balance WHERE account_id=$1 FOR UPDATE`,
      [debit]
    );

    const current = Number(bal.rows[0]?.balance || 0);

    if (current < amount) {
      throw new Error('Insufficient funds');
    }

    // ledger write via DB function (unbypassable)
    await client.query(
      `SELECT secure_ledger_post($1,$2,$3,$4)`,
      [txId, debit, credit, amount]
    );

    // CQRS sync
    await updateBalance(client, debit, -amount);
    await updateBalance(client, credit, amount);

    // outbox event
    await client.query(
      `INSERT INTO outbox (id, topic, payload)
       VALUES (gen_random_uuid(), 'ledger.posted', $1)`,
      [JSON.stringify({ txId, debit, credit, amount })]
    );

    return { txId };
  });
}

/**
 * Outbox Worker (production-safe polling)
 */
export async function runOutboxWorker() {
  while (true) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `SELECT id, topic, payload
         FROM outbox
         WHERE status='pending'
         FOR UPDATE SKIP LOCKED
         LIMIT 10`
      );

      for (const row of res.rows) {
        try {
          // simulate publish (Kafka/queue)
          console.log('publish', row.topic, row.payload);

          await client.query(
            `UPDATE outbox SET status='processed' WHERE id=$1`,
            [row.id]
          );
        } catch (e) {
          await client.query(
            `UPDATE outbox SET status='failed' WHERE id=$1`,
            [row.id]
          );
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    await new Promise((r) => setTimeout(r, 200));
  }
}
