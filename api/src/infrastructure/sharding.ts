import crypto from 'crypto';

const SHARDS = ['db1', 'db2', 'db3'];

export function getShardKey(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  const idx = parseInt(hash.substring(0, 8), 16) % SHARDS.length;
  return SHARDS[idx];
}
