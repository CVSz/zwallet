import Redis from 'ioredis';

const redis = new Redis();

interface RiskInput {
  userId: string;
  ip: string;
  amount: number;
}

export async function computeRiskScore(input: RiskInput): Promise<number> {
  let score = 0;

  const velocityKey = `tx_count:${input.userId}`;
  const txCount = await redis.incr(velocityKey);
  if (txCount === 1) await redis.expire(velocityKey, 60);

  if (txCount > 20) score += 40;
  if (input.amount > 10000) score += 30;

  const geoKey = `ip:${input.userId}:${input.ip}`;
  const known = await redis.get(geoKey);
  if (!known) {
    score += 30;
    await redis.set(geoKey, '1', 'EX', 86400);
  }

  return score;
}
