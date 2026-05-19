import Redis from 'ioredis';

const redis = new Redis();

export async function preventReplayV2(userId: string, nonce: string): Promise<void> {
  const key = `nonce:${userId}:${nonce}`;
  const ok = await redis.set(key, '1', 'NX', 'EX', 60);

  if (!ok) {
    throw new Error('Replay attack detected');
  }
}
