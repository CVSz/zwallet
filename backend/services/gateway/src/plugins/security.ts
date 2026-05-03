import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import type Redis from 'ioredis';

export async function securityPlugin(app: FastifyInstance) {
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' });

  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.addHook('preHandler', async (req, reply) => {
    const nonce = req.headers['x-nonce'];
    if (!nonce || typeof nonce !== 'string') {
      reply.code(400).send({ error: 'Missing anti-replay nonce' });
      return;
    }

    if (app.replay.has(nonce)) {
      reply.code(409).send({ error: 'Replay detected' });
      return;
    }

    app.replay.add(nonce);
  });

  app.addHook('onRequest', async (req, reply) => {
    const key = `rl:${req.ip}`;
    const count = await app.rateLimiter.incr(key);
    if (count === 1) {
      await app.rateLimiter.expire(key, 60);
    }
    if (count > 120) {
      reply.code(429).send({ error: 'Rate limit exceeded' });
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    replay: Set<string>;
    rateLimiter: Pick<Redis, 'incr' | 'expire'>;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
