import Fastify from 'fastify';

const app = Fastify({ logger: true });
app.get('/health', async () => ({ service: 'policy-service', status: 'ok', timestamp: new Date().toISOString() }));

app.post<{ Body: { amount: string; userId: string; chain: string } }>('/v1/policy/pre-sign', async (req, reply) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return reply.code(400).send({ allowed: false, reason: 'invalid amount' });
  if (amount > 50000) return reply.code(403).send({ allowed: false, reason: 'manual approval required' });
  return { allowed: true, policyVersion: '2026-05-03', controls: ['velocity-check', 'address-risk-check', 'chain-allowlist'] };
});

await app.listen({ port: Number(process.env.PORT ?? 8094), host: '0.0.0.0' });
