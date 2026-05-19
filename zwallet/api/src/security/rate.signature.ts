import Redis from 'ioredis';

const redis = new Redis();

export async function enforceSignatureRate(signature: string): Promise<void> {
  const key = `sig:${signature}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 5) {
    throw new Error('Signature rate exceeded');
  }
}
