import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createWorldcoinReposRoute } from "./worldcoinRepos.js";
import { createEventBusFromEnv, Events, type EventEnvelope } from "@zwallet/events";

const app = Fastify({ logger: true });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const eventBus = createEventBusFromEnv(process.env);
await eventBus.connect();

createWorldcoinReposRoute(app);

app.post("/swap/quote", async (req, reply) => {
  const bodySchema = z.object({
    fromToken: z.string().min(1),
    toToken: z.string().min(1),
    amount: z.string().min(1),
    slippageBps: z.number().int().min(1).max(500),
    user: z.string().min(1),
  });

  const body = bodySchema.parse(req.body);
  const envelope: EventEnvelope<typeof body> = {
    eventId: randomUUID(),
    idempotencyKey: `swap:${body.user}:${body.fromToken}:${body.toToken}:${body.amount}`,
    event: Events.SWAP_REQUESTED,
    payload: body,
    timestamp: new Date().toISOString(),
  };

  await eventBus.publish(Events.SWAP_REQUESTED, envelope);
  return reply.code(202).send({ status: "queued", idempotencyKey: envelope.idempotencyKey });
});

app.post('/tx/send', async (req, reply) => {
  const bodySchema = z.object({
    chainId: z.number().int().positive(),
    from: z.string().min(1),
    to: z.string().min(1),
    value: z.string().min(1),
    nonce: z.number().int().nonnegative(),
  });

  const body = bodySchema.parse(req.body);
  const envelope: EventEnvelope<typeof body> = {
    eventId: randomUUID(),
    idempotencyKey: `${body.chainId}:${body.from}:${body.nonce}`,
    event: Events.TX_REQUESTED,
    payload: body,
    timestamp: new Date().toISOString(),
  };

  await eventBus.publish(Events.TX_REQUESTED, envelope);
  return reply.code(202).send({ status: 'queued', idempotencyKey: envelope.idempotencyKey });
});

await app.listen({ port: 3000, host: "0.0.0.0" });
