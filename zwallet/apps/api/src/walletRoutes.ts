import { buildTransferDigest } from '@zwallet/wallet-engine/walletEngine';

interface FastifyLike {
  post: (path: string, handler: (req: { body: unknown }, reply: { code: (status: number) => { send: (payload: unknown) => unknown } }) => Promise<unknown>) => void;
}

export function createWalletRoutes(app: FastifyLike): void {
  app.post('/wallet/transfer/preview', async (req, reply) => {
    try {
      const preview = buildTransferDigest(req.body);
      return reply.code(200).send(preview);
    } catch (error) {
      return reply.code(400).send({
        error: 'INVALID_TRANSFER_REQUEST',
        message: error instanceof Error ? error.message : 'Unknown request validation error'
      });
    }
  });
}
