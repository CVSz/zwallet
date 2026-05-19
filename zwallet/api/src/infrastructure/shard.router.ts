import crypto from 'crypto';

export function shard(userId: string, shards: string[]): string {
  const hash = crypto.createHash('sha256').update(userId).digest();
  const idx = hash.readUInt32BE(0) % shards.length;
  return shards[idx];
}
