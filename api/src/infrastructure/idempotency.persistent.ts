export async function enforceIdempotencyPersistent(eventId: string, db: any): Promise<boolean> {
  try {
    await db.query(`INSERT INTO event_dedup(event_id) VALUES ($1)`, [eventId]);
    return false;
  } catch {
    return true;
  }
}
