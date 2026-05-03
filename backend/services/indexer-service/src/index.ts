import Fastify from 'fastify';
import { IndexerWorker, InMemoryQueue } from './worker.js';
import { PostgresStateStore } from './state-store.js';

const app = Fastify({ logger: true });

const queue = new InMemoryQueue();
const stateStore = new PostgresStateStore();
const worker = new IndexerWorker(queue, stateStore);

app.get('/health', async () => ({
  service: 'indexer-service',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

app.post<{ Body: { messages: unknown[] } }>('/queue/publish', async (req) => {
  for (const message of req.body.messages) {
    await queue.publish(message);
  }
  return { accepted: req.body.messages.length };
});

app.post('/worker/run-once', async () => {
  const processed = await worker.drainOnce();
  return { processed };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
