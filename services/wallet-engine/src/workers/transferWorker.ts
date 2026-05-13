import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";
import { PostgresTransferRepository } from "../repositories/postgres/transfers.js";
import { getChainAdapter } from "../chains/index.js";
import { signTransferSimulation } from "../signing/index.js";

const repo = process.env.DATABASE_URL
  ? new PostgresTransferRepository()
  : undefined;

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    const transferId = String(job.data.transferId);

    if (!repo) {
      throw new Error("DATABASE_URL is required for distributed transfer worker");
    }

    const transfer = await repo.getById(transferId);

    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    await repo.updateStatus(transfer.id, "executing");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (BigInt(transfer.amountAtomic) <= 0n) {
      return repo.updateStatus(transfer.id, "failed", {
        failureReason: "amountAtomic must be positive"
      });
    }

    const adapter = getChainAdapter(transfer.chain);
    await adapter.estimateFee(transfer);
    await signTransferSimulation(transfer);
    const broadcast = await adapter.broadcastTransfer(transfer);

    return repo.updateStatus(transfer.id, "confirmed", {
      txHash: broadcast.txHash
    });
  },
  {
    connection: redisConnection,
    concurrency: 5
  }
);

worker.on("completed", (job, result) => {
  console.log(`[transfer-worker] completed ${job.id}`, result?.status, result?.txHash);
});

worker.on("failed", (job, err) => {
  console.error(`[transfer-worker] failed ${job?.id}`, err);
});

console.log("[transfer-worker] started");
