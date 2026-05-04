import { fetchPendingEvents, markEventProcessed } from './outbox.repository';
import { sendEvent } from './kafka.producer';

export async function runOutboxWorker(): Promise<void> {
  while (true) {
    const events = await fetchPendingEvents(100);
    for (const e of events) {
      try {
        await sendEvent(e.topic, e.payload);
        await markEventProcessed(e.id);
      } catch (err) {
        console.error('outbox publish failed', err);
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
