const { buildTransferDigest } = require('../../../services/wallet-engine/src/walletEngine');

function createWalletRoutes(app) {
  app.post('/wallet/transfer/preview', async (req, reply) => {
    try {
      const preview = buildTransferDigest(req.body);
      return reply.code(200).send(preview);
    } catch (error) {
      return reply.code(400).send({
        error: 'INVALID_TRANSFER_REQUEST',
        message: error instanceof Error ? error.message : 'Unknown request validation error',
      });
    }
  });
}

module.exports = { createWalletRoutes };
