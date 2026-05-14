import pg from "pg";

import {
  listTransfers,
} from "../../repositories/postgres/transfers.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/zwallet",
});

export async function getRuntimeWalletOverview() {
  const [
    accountsResult,
    balancesResult,
    eventsResult,
    transfers,
  ] = await Promise.all([
    pool.query(`
      select *
      from wallet_accounts
      order by created_at desc
      limit 100
    `),

    pool.query(`
      select *
      from wallet_balances
      order by updated_at desc
      limit 100
    `),

    pool.query(`
      select *
      from wallet_events
      order by created_at desc
      limit 100
    `),

    listTransfers(),
  ]);

  const accounts = accountsResult.rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    chain: row.chain,
    address: row.address,
    label: row.label,
    status: row.status,
    createdAt: new Date(
      row.created_at
    ).toISOString(),
    updatedAt: new Date(
      row.updated_at
    ).toISOString(),
  }));

  const balances = balancesResult.rows.map((row: any) => ({
    accountId: row.account_id,
    chain: row.chain,
    asset: row.asset,
    amountAtomic: row.amount_atomic,
    decimals: row.decimals,
    updatedAt: new Date(
      row.updated_at
    ).toISOString(),
  }));

  const events = eventsResult.rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    chain: row.chain,
    userId: row.user_id,
    payload: row.payload,
    occurredAt: new Date(
      row.created_at
    ).toISOString(),
  }));

  return {
    accounts,
    balances,
    transfers,
    events,
  };
}
