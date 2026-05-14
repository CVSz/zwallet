import * as RedisModule from "ioredis";

const RedisCtor =
  (RedisModule as any).default ??
  (RedisModule as any);

export function createRedisConnection() {
  return new RedisCtor(
    process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    {
      maxRetriesPerRequest: null,
    }
  );
}

export const redisConnection =
  createRedisConnection();

redisConnection.on("connect", () => {
  console.log("[wallet-engine] redis connected");
});

redisConnection.on("error", (err: unknown) => {
  console.error(
    "[wallet-engine] redis error",
    err
  );
});
