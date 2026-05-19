import Redis from 'ioredis';

const redis = new Redis();

export async function enforceIdempotency(eventId: string): Promise<boolean> {
  const key = `idem:event:${eventId}`;
  const alreadyProcessed = await redis.get(key);
  if (alreadyProcessed) {
    return true;
  }

  await redis.set(key, '1', 'EX', 86400);
  return false;
}

export async function checkIdempotency(key: string): Promise<void> {
  const ok = await redis.set(`idem:${key}`, '1', 'NX', 'EX', 300);
  if (!ok) {
    throw new Error('Duplicate request (global)');
  }
}

export async function enforceIdempotency(eventId: string, db) {
  try {
    await db.query(
      `INSERT INTO event_dedup(event_id) VALUES ($1)`,
      [eventId]
    )
    return false
  } catch {
    return true
  }
}
