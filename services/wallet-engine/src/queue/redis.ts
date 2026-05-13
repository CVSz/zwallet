import { Redis } from "ioredis";

export const redisConnection = new Redis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
);

redisConnection.on("connect", () => {
  console.log("[wallet-engine] redis connected");
});

redisConnection.on("error", (err: Error) => {
  console.error("[wallet-engine] redis error", err);
});
