import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { DefaultPolicyEngine } from './service.js';
import { preSignRequestSchema } from './schemas.js';

export function createApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const engine = new DefaultPolicyEngine();
  const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

  app.get('/health', async () => ({ service: 'policy-service', status: 'ok', timestamp: new Date().toISOString() }));


  app.addHook('onRequest', async (req, reply) => {
    const key = req.ip;
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 120;
    const current = rateLimitStore.get(key);

    if (!current || now - current.windowStart >= windowMs) {
      rateLimitStore.set(key, { count: 1, windowStart: now });
      return;
    }

    current.count += 1;
    if (current.count > maxRequests) {
      return reply.code(429).send({ allowed: false, reason: 'rate limit exceeded', failureCode: 'RATE_LIMITED' });
    }
  });

  app.post('/v1/policy/pre-sign', async (req, reply) => {
    const parsed = preSignRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ allowed: false, reason: 'invalid request body', failureCode: 'INVALID_INPUT' });
    }

    const decision = engine.evaluatePreSign(parsed.data);
    if (!decision.allowed) {
      return reply.code(decision.failureCode === 'MANUAL_APPROVAL_REQUIRED' ? 403 : 400).send(decision);
    }

    return decision;
  });

  return app;
}
