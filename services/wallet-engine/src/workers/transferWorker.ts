import { Worker } from "bullmq";
import { createRedisConnection } from "../queue/redis.js";
import {
  getTransferById,
  updateTransferStatus,
} from "../repositories/postgres/transfers.js";
import { broadcastTransfer } from "../adapters/index.js";

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    console.log("[transfer-worker] received job", job.id, job.data);

    const transfer = await getTransferById(String(job.data.transferId));

    if (!transfer) {
      throw new Error("transfer not found");
    }

    await updateTransferStatus(transfer.id, "executing");

    const broadcast = await broadcastTransfer(transfer);

    const updated = await updateTransferStatus(transfer.id, "confirmed", {
      txHash: broadcast.txHash,
    });

    console.log("[transfer-worker] completed", updated.id, updated.txHash);

    return updated;
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log("[transfer-worker] BullMQ completed", job.id);
});

worker.on("failed", (job, err) => {
  console.error("[transfer-worker] failed", job?.id, err);
});

console.log("[wallet-engine] transfer worker online");
