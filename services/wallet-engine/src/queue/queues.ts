import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const transferExecutionQueue = new Queue(
  "transfer-execution",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
