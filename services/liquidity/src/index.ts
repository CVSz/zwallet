import { MultiRpcPool, createFetchRpcClient, type RpcProvider } from '@zwallet/rpc';

const rpcProviders: RpcProvider[] = [
  { id: 'primary', chain: 'evm', url: process.env.RPC_EVM_PRIMARY ?? 'http://localhost:8545', priority: 120 },
  { id: 'secondary', chain: 'evm', url: process.env.RPC_EVM_SECONDARY ?? 'http://localhost:8546', priority: 100 },
  { id: 'solana-primary', chain: 'solana', url: process.env.RPC_SOLANA_PRIMARY ?? 'http://localhost:8899', priority: 110 },
  { id: 'btc-primary', chain: 'btc', url: process.env.RPC_BTC_PRIMARY ?? 'http://localhost:8332', priority: 110 },
];

export const rpcPool = new MultiRpcPool(rpcProviders, createFetchRpcClient);

export interface OfframpQuoteRequest {
  userId: string;
  chain: 'evm' | 'solana' | 'bitcoin';
  asset: string;
  amountAtomic: string;
  targetCurrency: string;
}

export interface OfframpQuote {
  provider: string;
  payoutMinor: number;
  feeMinor: number;
  expiresAt: string;
}

export interface OfframpProvider {
  getQuote(request: OfframpQuoteRequest): Promise<OfframpQuote>;
  execute(request: OfframpExecutionRequest): Promise<{ settlementId: string; status: 'submitted' | 'settled' }>;
}

export interface OfframpExecutionRequest {
  quote: OfframpQuote;
  amountAtomic: string;
  destination: {
    rail: 'bank_transfer' | 'card';
    tokenizedRecipientId: string;
  };
  idempotencyKey: string;
}

function parsePositiveAtomic(value: string): bigint {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error('amountAtomic must be an unsigned integer string');
  }
  const amount = BigInt(value);
  if (amount <= 0n) {
    throw new Error('amountAtomic must be greater than zero');
  }
  return amount;
}

export class OfframpService {
  constructor(private readonly provider: OfframpProvider) {}

  async quote(request: OfframpQuoteRequest): Promise<OfframpQuote> {
    parsePositiveAtomic(request.amountAtomic);
    const quote = await this.provider.getQuote(request);
    if (quote.payoutMinor <= 0) {
      throw new Error('provider quote payoutMinor must be positive');
    }
    return quote;
  }

  async execute(request: OfframpExecutionRequest): Promise<{ settlementId: string; status: 'submitted' | 'settled' }> {
    parsePositiveAtomic(request.amountAtomic);
    if (!request.idempotencyKey || request.idempotencyKey.trim().length < 10) {
      throw new Error('idempotencyKey must be present for financial operations');
    }
    if (!request.destination.tokenizedRecipientId) {
      throw new Error('tokenizedRecipientId is required; raw PCI data is prohibited');
    }
    return this.provider.execute(request);
  }
}
