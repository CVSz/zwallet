import Redis from 'ioredis';

const redis = new Redis();

export async function checkIdempotency(key: string): Promise<void> {
  const ok = await redis.set(`idem:${key}`, '1', 'NX', 'EX', 300);
  if (!ok) {
    throw new Error('Duplicate request (global)');
  }
}
