import Fastify from 'fastify';
import { WalletEngine, type TxPayload } from '@zwallet/shared';

const app = Fastify({ logger: true });
const engine = new WalletEngine();

app.get('/health', async () => ({ service: 'tx-orchestrator', status: 'ok', timestamp: new Date().toISOString() }));

app.post('/v1/tx/simulate', async (req, reply) => {
  const payload = req.body as TxPayload;
  const result = engine.simulateTransaction(payload);
  if (!result.success) {
    return reply.code(400).send(result);
  }
  return result;
});

app.post('/v1/tx/verify-signature', async (req, reply) => {
  const { payload, signatureHex, signerId } = req.body as { payload: TxPayload; signatureHex: string; signerId: string };
  const ok = engine.verifyTransactionSignature(payload, signatureHex, Buffer.from(signerId));
  if (!ok) {
    return reply.code(400).send({ verified: false, error: 'Invalid signature' });
  }
  return { verified: true };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
