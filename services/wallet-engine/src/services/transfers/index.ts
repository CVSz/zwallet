import type { WalletTransferRecord } from "../../walletEngine.js";
import {
  createTransferRecord,
  getTransferById,
  listTransfers,
  updateTransferStatus,
} from "../../repositories/postgres/transfers.js";

export async function createTransferPreview(input: {
  chain: "evm" | "solana" | "bitcoin";
  from: string;
  to: string;
  amountAtomic: string;
  nonce?: number;
}): Promise<WalletTransferRecord> {
  return createTransferRecord(input);
}

export async function getTransfer(id: string): Promise<WalletTransferRecord | undefined> {
  return getTransferById(id);
}

export async function getTransfers(): Promise<WalletTransferRecord[]> {
  return listTransfers();
}

export async function markTransferQueued(id: string): Promise<WalletTransferRecord> {
  return updateTransferStatus(id, "queued");
}
