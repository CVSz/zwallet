import Redis from 'ioredis';

const redis = new Redis();

export async function rateLimit(ip: string) {
  const key = `rate:${ip}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 100) {
    throw new Error('Rate limit exceeded');
  }
}
