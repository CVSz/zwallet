import { fetchPendingEvents, markEventProcessed } from './outbox.repository';
import { sendEvent } from './kafka.producer';
import { enforceIdempotency } from './idempotency.global';

export async function runOutboxWorker(): Promise<void> {
  while (true) {
    const events = await fetchPendingEvents(100);
    for (const e of events) {
      try {
        const duplicate = await enforceIdempotency(String(e.id));
        if (duplicate) {
          await markEventProcessed(e.id);
          continue;
        }

        await sendEvent(e.topic, e.payload);
        await markEventProcessed(e.id);
      } catch (err) {
        console.error('outbox publish failed', err);
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
