const SUPPORTED_CHAINS = Object.freeze(['evm', 'solana', 'bitcoin']);

function isSupportedChain(value) {
  return SUPPORTED_CHAINS.includes(value);
}

function assertAddress(address) {
  if (typeof address !== 'string' || address.length < 10) {
    throw new Error('Address must be a string with at least 10 characters');
  }
}

function assertTransferRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error('Transfer request must be an object');
  }
  if (!isSupportedChain(request.chain)) {
    throw new Error(`Unsupported chain: ${String(request.chain)}`);
  }
  assertAddress(request.from);
  assertAddress(request.to);
  if (!/^\d+$/.test(String(request.amountAtomic))) {
    throw new Error('amountAtomic must be a positive integer string');
  }
}

module.exports = {
  SUPPORTED_CHAINS,
  isSupportedChain,
  assertTransferRequest,
};
