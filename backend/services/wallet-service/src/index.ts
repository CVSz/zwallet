import Fastify from 'fastify';
import { createHash } from 'node:crypto';

const app = Fastify({ logger: true });
app.get('/health', async () => ({ service: 'wallet-service', status: 'ok', timestamp: new Date().toISOString() }));

app.post<{ Body: { userId: string; chain: string } }>('/v1/wallets/default', async (req) => {
  const seed = `${req.body.userId}:${req.body.chain}`;
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 40);
  const address = req.body.chain === 'solana' ? `So${hex.slice(0, 30)}` : `0x${hex}`;
  return { userId: req.body.userId, chain: req.body.chain, address, custody: 'self-custody', keyRef: `hsm://${req.body.userId}` };
});

await app.listen({ port: Number(process.env.PORT ?? 8090), host: '0.0.0.0' });
