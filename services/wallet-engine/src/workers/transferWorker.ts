import { Worker } from "bullmq";

import { redisConnection } from "../queue/redis.js";

import {
  markTransferExecuting,
  markTransferConfirmed,
  markTransferFailed,
} from "../services/transfers/index.js";

const worker = new Worker(
  "transfer-execution",
  async (job) => {
    const transfer = job.data.transfer;

    const executing = markTransferExecuting(transfer);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (BigInt(executing.amountAtomic) <= 0n) {
      return markTransferFailed(
        executing,
        "amountAtomic must be positive"
      );
    }

    return markTransferConfirmed(
      executing,
      `simulated-${executing.id}`
    );
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job, result) => {
  console.log(
    `[transfer-worker] completed ${job.id}`,
    result?.status
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[transfer-worker] failed ${job?.id}`,
    err
  );
});

console.log("[transfer-worker] started");
