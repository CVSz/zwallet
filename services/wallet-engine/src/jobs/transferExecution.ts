import { transferExecutionQueue } from "../queue/queues.js";

export interface TransferExecutionJobPayload {
  transferId: string;
}

export async function enqueueTransferExecution(
  payload: TransferExecutionJobPayload
) {
  return transferExecutionQueue.add(
    "execute-transfer",
    payload
  );
}
