import Fastify from 'fastify';

const app = Fastify({ logger: true });
app.get('/health', async () => ({ service: 'portfolio-service', status: 'ok', timestamp: new Date().toISOString() }));

app.post<{ Body: { userId: string; chain: string; walletAddress: string; txHash: string } }>('/v1/portfolio/display', async (req) => {
  return {
    userId: req.body.userId,
    chain: req.body.chain,
    walletAddress: req.body.walletAddress,
    lastTx: req.body.txHash,
    balances: [
      { symbol: req.body.chain === 'solana' ? 'SOL' : 'ETH', amount: '1.20' },
      { symbol: 'USDC', amount: '950.00' }
    ],
    updatedAt: new Date().toISOString()
  };
});

await app.listen({ port: Number(process.env.PORT ?? 8095), host: '0.0.0.0' });
