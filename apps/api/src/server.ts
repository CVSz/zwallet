import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { IntentRouter } from "@zwallet/router";

const app = Fastify({ logger: true });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const router = new IntentRouter([
  "https://solver-1.internal",
  "https://solver-2.internal",
]);

app.post("/swap/quote", async (req, reply) => {
  const bodySchema = z.object({
    fromToken: z.string().min(1),
    toToken: z.string().min(1),
    amount: z.string().min(1),
    slippageBps: z.number().int().min(1).max(500),
    user: z.string().min(1),
  });

  const body = bodySchema.parse(req.body);
  const quotes = await router.fetchQuotes(body);
  const best = router.pickBest(quotes);

  return reply.send(best);
});

await app.listen({ port: 3000, host: "0.0.0.0" });
