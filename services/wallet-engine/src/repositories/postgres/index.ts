import pg from "pg";
import type { WalletRepository } from "../types/index.js";

const { Pool } = pg;

export class PostgresWalletRepository implements WalletRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  async healthcheck(): Promise<boolean> {
    const result = await this.pool.query("SELECT 1");
    return result.rowCount === 1;
  }
}
