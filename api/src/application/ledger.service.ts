// api/src/application/ledger.service.ts
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Enforces strict double-entry accounting:
 * every transaction MUST sum to zero.
 */
export async function postDoubleEntry(params: {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  referenceId?: string;
}) {
  const { debitAccount, creditAccount, amount } = params;

  if (!debitAccount || !creditAccount) {
    throw new Error('Invalid accounts');
  }

  if (debitAccount === creditAccount) {
    throw new Error('Accounts must differ');
  }

  if (amount <= 0) {
    throw new Error('Invalid amount');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txId = crypto.randomUUID();

    // insert BOTH sides (zero-sum invariant)
    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, direction)
       VALUES
        ($1,$2,$3,'debit'),
        ($1,$4,$3,'credit')`,
      [txId, debitAccount, amount, creditAccount]
    );

    // optional invariant check (defensive)
    const check = await client.query(
      `SELECT SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END) as total
       FROM ledger_entries WHERE transaction_id=$1`,
      [txId]
    );

    if (Number(check.rows[0].total) !== 0) {
      throw new Error('Ledger invariant violated');
    }

    await client.query('COMMIT');

    return { txId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
