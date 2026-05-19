import Redis from 'ioredis';

const redis = new Redis();

export async function preventReplay(nonce: string): Promise<void> {
  const key = `nonce:${nonce}`;
  const ok = await redis.set(key, '1', 'NX', 'EX', 300);

  if (!ok) {
    throw new Error('Replay attack detected');
  }
}
