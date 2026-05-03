import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { DefaultPolicyEngine } from './service.js';
import { preSignRequestSchema } from './schemas.js';

export function createApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const engine = new DefaultPolicyEngine();

  app.get('/health', async () => ({ service: 'policy-service', status: 'ok', timestamp: new Date().toISOString() }));

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
