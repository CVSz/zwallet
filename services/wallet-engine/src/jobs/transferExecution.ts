import { transferExecutionQueue } from "../queue/queues.js";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface TransferExecutionJobPayload {
  transfer: WalletTransferRecord;
}

export async function enqueueTransferExecution(
  transfer: WalletTransferRecord
) {
  return transferExecutionQueue.add(
    "execute-transfer",
    {
      transfer,
    }
  );
}
