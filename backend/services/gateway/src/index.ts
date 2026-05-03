import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ service: 'gateway', status: 'ok', timestamp: new Date().toISOString() }));

const authHeaders = z.object({
  'x-tenant-id': z.string().min(2),
  'x-tenant-plan': z.enum(['free', 'pro', 'enterprise']).default('free'),
  'x-tenant-region': z.string().default('us-east-1')
});

app.post('/v1/tx/intent', async (req, reply) => {
  const headers = authHeaders.safeParse(req.headers);
  if (!headers.success) return reply.code(401).send({ error: 'Missing tenant headers' });
  return {
    intentId: crypto.randomUUID(),
    signablePayload: { hash: crypto.randomUUID(), expiresInSec: 60 },
    tenant: headers.data
  };
});

app.post('/v1/tx/submit', async () => ({ accepted: true, state: 'broadcasting' }));

await app.listen({ port: Number(process.env.PORT ?? 8080), host: '0.0.0.0' });
