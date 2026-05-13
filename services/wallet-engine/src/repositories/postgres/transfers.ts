import pg from "pg";
import type { WalletTransferRecord } from "../../walletEngine.js";

const { Pool } = pg;

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

export class PostgresTransferRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString = process.env.DATABASE_URL ?? "") {
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for PostgresTransferRepository");
    }

    this.pool = new Pool({ connectionString });
  }

  async getById(id: string): Promise<WalletTransferRecord | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM wallet_transfers WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];

    return row ? rowToTransfer(row) : undefined;
  }

  async list(): Promise<WalletTransferRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM wallet_transfers ORDER BY created_at DESC`
    );

    return result.rows.map(rowToTransfer);
  }

  async upsert(record: WalletTransferRecord): Promise<WalletTransferRecord> {
    await this.pool.query(
      `
      INSERT INTO wallet_transfers (
        id,
        digest,
        chain,
        from_address,
        to_address,
        amount_atomic,
        nonce,
        status,
        tx_hash,
        failure_reason,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      ON CONFLICT (id) DO UPDATE SET
        digest = EXCLUDED.digest,
        chain = EXCLUDED.chain,
        from_address = EXCLUDED.from_address,
        to_address = EXCLUDED.to_address,
        amount_atomic = EXCLUDED.amount_atomic,
        nonce = EXCLUDED.nonce,
        status = EXCLUDED.status,
        tx_hash = EXCLUDED.tx_hash,
        failure_reason = EXCLUDED.failure_reason,
        updated_at = EXCLUDED.updated_at
      `,
      [
        record.id,
        record.digest,
        record.chain,
        record.from,
        record.to,
        record.amountAtomic,
        record.nonce,
        record.status,
        record.txHash ?? null,
        record.failureReason ?? null,
        record.createdAt,
        record.updatedAt
      ]
    );

    return record;
  }

  async updateStatus(
    id: string,
    status: WalletTransferRecord["status"],
    options: {
      txHash?: string;
      failureReason?: string;
    } = {}
  ): Promise<WalletTransferRecord> {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error(`Transfer not found: ${id}`);
    }

    const updated: WalletTransferRecord = {
      ...existing,
      status,
      updatedAt: new Date().toISOString()
    };

    if (options.txHash) updated.txHash = options.txHash;
    if (options.failureReason) updated.failureReason = options.failureReason;

    return this.upsert(updated);
  }
}
