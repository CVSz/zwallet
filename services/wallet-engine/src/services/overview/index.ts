import { getWalletOverview, type WalletOverview } from "../../walletEngine.js";
import { PostgresOverviewRepository } from "../../repositories/postgres/overview.js";

export async function getRuntimeWalletOverview(): Promise<WalletOverview> {
  if (!process.env.DATABASE_URL) {
    return getWalletOverview();
  }

  const repo = new PostgresOverviewRepository();

  return repo.getOverview();
}
