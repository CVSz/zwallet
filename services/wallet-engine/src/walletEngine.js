const { createHash, randomUUID } = require('node:crypto');
const { assertTransferRequest } = require('../../../packages/shared-types/src/wallet');

function buildTransferDigest(request) {
  assertTransferRequest(request);

  const canonical = JSON.stringify({
    chain: request.chain,
    from: request.from.toLowerCase(),
    to: request.to.toLowerCase(),
    amountAtomic: String(request.amountAtomic),
    nonce: Number(request.nonce ?? 0),
    createdAt: request.createdAt ?? new Date().toISOString(),
  });

  return {
    id: randomUUID(),
    digest: createHash('sha256').update(canonical).digest('hex'),
    canonical,
  };
}

module.exports = {
  buildTransferDigest,
};
