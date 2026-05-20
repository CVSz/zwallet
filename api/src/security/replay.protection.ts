import Redis from 'ioredis';

const redis = new Redis();

export async function preventReplay(userId: string, nonce: string): Promise<void> {
  const key = `nonce:${userId}:${nonce}`;
  const isNew = await redis.set(key, '1', 'EX', 900, 'NX');
  if (!isNew) {
    throw new Error('Replay attack detected: Nonce has already been used.');
  }
}
