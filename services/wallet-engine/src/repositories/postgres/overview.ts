import pg from "pg";
import type {
  WalletAccount,
  WalletBalance,
  WalletEventRecord,
  WalletOverview,
  WalletTransferRecord
} from "../../walletEngine.js";

const { Pool } = pg;

function rowToAccount(row: Record<string, unknown>): WalletAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    chain: row.chain as WalletAccount["chain"],
    address: String(row.address),
    label: String(row.label ?? "Wallet"),
    status: row.status as WalletAccount["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function rowToBalance(row: Record<string, unknown>): WalletBalance {
  return {
    accountId: String(row.account_id),
    chain: row.chain as WalletBalance["chain"],
    asset: String(row.asset_symbol),
    amountAtomic: String(row.amount_atomic),
    decimals: Number(row.decimals ?? 18),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function rowToTransfer(row: Record<string, unknown>): WalletTransferRecord {
  const transfer: WalletTransferRecord = {
    id: String(row.id),
    digest: String(row.digest),
    chain: row.chain as WalletTransferRecord["chain"],
    from: String(row.from_address),
    to: String(row.to_address),
    amountAtomic: String(row.amount_atomic),
    nonce: Number(row.nonce ?? 0),
    status: row.status as WalletTransferRecord["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };

  if (row.tx_hash) transfer.txHash = String(row.tx_hash);
  if (row.failure_reason) transfer.failureReason = String(row.failure_reason);

  return transfer;
}

function rowToEvent(row: Record<string, unknown>): WalletEventRecord {
  return {
    id: String(row.id),
    type: row.type as WalletEventRecord["type"],
    chain: String(row.chain ?? "evm") as WalletEventRecord["chain"],
    userId: String(row.user_id ?? "system"),
    payload: row.payload as Record<string, unknown>,
    occurredAt: new Date(String(row.created_at)).toISOString()
  };
}

export class PostgresOverviewRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL ?? "") {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for PostgresOverviewRepository");
    }

    this.pool = new Pool({ connectionString });
  }

  async getOverview(): Promise<WalletOverview> {
    const [accounts, balances, transfers, events] = await Promise.all([
      this.pool.query(`SELECT * FROM wallet_accounts ORDER BY created_at ASC`),
      this.pool.query(`
        SELECT
          b.account_id,
          a.chain,
          b.asset_symbol,
          b.amount_atomic,
          COALESCE(b.decimals, CASE WHEN a.chain = 'bitcoin' THEN 8 WHEN a.chain = 'solana' THEN 9 ELSE 18 END) AS decimals,
          b.updated_at
        FROM wallet_balances b
        JOIN wallet_accounts a ON a.id = b.account_id
        ORDER BY a.chain ASC
      `),
      this.pool.query(`SELECT * FROM wallet_transfers ORDER BY created_at DESC`),
      this.pool.query(`SELECT * FROM wallet_events ORDER BY created_at DESC LIMIT 100`)
    ]);

    return {
      accounts: accounts.rows.map(rowToAccount),
      balances: balances.rows.map(rowToBalance),
      transfers: transfers.rows.map(rowToTransfer),
      events: events.rows.map(rowToEvent)
    };
  }
}
