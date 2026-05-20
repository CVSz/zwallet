import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createWorldcoinReposRoute } from "./worldcoinRepos.js";
import { createEventBusFromEnv, Events, type EventEnvelope } from "@zwallet/events";

const app = Fastify({ logger: true });

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address format");
const positiveDecimalString = z
  .string()
  .regex(/^\d+$/, "amount must be a positive integer string")
  .refine((value) => BigInt(value) > 0n, "amount must be greater than zero");

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const eventBus = createEventBusFromEnv(process.env);
await eventBus.connect();

createWorldcoinReposRoute(app);

app.get("/health", async () => ({ ok: true }));

app.post("/transfer/preview", async (req) => {
  const bodySchema = z.object({
    from: evmAddressSchema,
    to: evmAddressSchema,
    amount: positiveDecimalString,
    asset: z.string().min(1).max(16),
  });

  const body = bodySchema.parse(req.body);
  const networkFee = "21000";
  return {
    ok: true,
    preview: {
      from: body.from,
      to: body.to,
      amount: body.amount,
      asset: body.asset.toUpperCase(),
      networkFee,
      totalDebit: (BigInt(body.amount) + BigInt(networkFee)).toString(),
    },
  };
});

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
    from: evmAddressSchema,
    to: evmAddressSchema,
    value: positiveDecimalString,
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
