export const SUPPORTED_CHAINS = Object.freeze(['evm', 'solana', 'bitcoin'] as const);

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export interface TransferRequest {
  chain: SupportedChain;
  from: string;
  to: string;
  amountAtomic: string;
  nonce?: number;
  createdAt?: string;
}

export function isSupportedChain(value: unknown): value is SupportedChain {
  return typeof value === 'string' && SUPPORTED_CHAINS.includes(value as SupportedChain);
}

function assertAddress(address: unknown): asserts address is string {
  if (typeof address !== 'string' || address.length < 10) {
    throw new Error('Address must be a string with at least 10 characters');
  }
}

export function assertTransferRequest(request: unknown): asserts request is TransferRequest {
  if (!request || typeof request !== 'object') {
    throw new Error('Transfer request must be an object');
  }

  const payload = request as Partial<TransferRequest>;
  if (!isSupportedChain(payload.chain)) {
    throw new Error(`Unsupported chain: ${String(payload.chain)}`);
  }
  assertAddress(payload.from);
  assertAddress(payload.to);
  if (!/^\d+$/.test(String(payload.amountAtomic))) {
    throw new Error('amountAtomic must be a positive integer string');
  }
}
