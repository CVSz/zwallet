import { FastifyRequest, FastifyReply } from 'fastify';

const store = new Map<string, boolean>();

export async function idempotency(req: FastifyRequest, res: FastifyReply) {
  const key = req.headers['idempotency-key'];

  if (!key || typeof key !== 'string') {
    return res.status(400).send({ error: 'Missing idempotency key' });
  }

  if (store.has(key)) {
    return res.status(409).send({ error: 'Duplicate request' });
  }

  store.set(key, true);
}
