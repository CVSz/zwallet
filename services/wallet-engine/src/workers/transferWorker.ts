import {
  markTransferConfirmed,
  markTransferExecuting,
  markTransferFailed,
} from "../services/transfers/transferQueue.js";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface TransferWorkerResult {
  transfer: WalletTransferRecord;
  simulated: boolean;
}

export async function executeTransferSimulation(
  transfer: WalletTransferRecord
): Promise<TransferWorkerResult> {
  const executing = markTransferExecuting(transfer);

  await new Promise((resolve) => setTimeout(resolve, 50));

  if (BigInt(executing.amountAtomic) <= 0n) {
    return {
      transfer: markTransferFailed(executing, "amountAtomic must be positive"),
      simulated: true,
    };
  }

  return {
    transfer: markTransferConfirmed(executing),
    simulated: true,
  };
}
