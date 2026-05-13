import type { WalletRepository } from "../types/index.js";

export class MemoryWalletRepository implements WalletRepository {
  async healthcheck(): Promise<boolean> {
    return true;
  }
}
