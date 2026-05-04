import { MultiRpcPool, createFetchRpcClient, type RpcProvider } from '@zwallet/rpc';

const rpcProviders: RpcProvider[] = [
  { id: 'primary', chain: 'evm', url: process.env.RPC_EVM_PRIMARY ?? 'http://localhost:8545', priority: 120 },
  { id: 'secondary', chain: 'evm', url: process.env.RPC_EVM_SECONDARY ?? 'http://localhost:8546', priority: 100 },
  { id: 'solana-primary', chain: 'solana', url: process.env.RPC_SOLANA_PRIMARY ?? 'http://localhost:8899', priority: 110 },
  { id: 'btc-primary', chain: 'btc', url: process.env.RPC_BTC_PRIMARY ?? 'http://localhost:8332', priority: 110 },
];

export const rpcPool = new MultiRpcPool(rpcProviders, createFetchRpcClient);

export interface CardIssuanceRequest {
  userId: string;
  kycProfileId: string;
  spendLimitMinor: number;
  allowedMcc: string[];
}

export interface CardIssueResult {
  cardToken: string;
  status: 'issued' | 'pending';
  issuerReference: string;
}

export interface IssuerCardPayload {
  customerReference: string;
  metadata: Record<string, string>;
  controls: {
    spendLimitMinor: number;
    allowedMcc: string[];
  };
}

export interface IssuerApi {
  createTokenizedCard(payload: IssuerCardPayload): Promise<{ cardToken: string; issuerReference: string; status: 'issued' | 'pending' }>;
  freezeCard(cardToken: string): Promise<void>;
  unfreezeCard(cardToken: string): Promise<void>;
}

function assertNonEmpty(value: string, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
}

export class CardIssuanceService {
  constructor(private readonly issuerApi: IssuerApi) {}

  async issueCard(request: CardIssuanceRequest): Promise<CardIssueResult> {
    assertNonEmpty(request.userId, 'userId');
    assertNonEmpty(request.kycProfileId, 'kycProfileId');

    if (!Number.isInteger(request.spendLimitMinor) || request.spendLimitMinor <= 0) {
      throw new Error('spendLimitMinor must be a positive integer');
    }

    if (request.allowedMcc.length === 0) {
      throw new Error('allowedMcc must include at least one MCC code');
    }

    const result = await this.issuerApi.createTokenizedCard({
      customerReference: request.kycProfileId,
      metadata: {
        userId: request.userId,
        pciIsolation: 'tokenized-only'
      },
      controls: {
        spendLimitMinor: request.spendLimitMinor,
        allowedMcc: request.allowedMcc
      }
    });

    return {
      cardToken: result.cardToken,
      issuerReference: result.issuerReference,
      status: result.status
    };
  }

  freeze(cardToken: string): Promise<void> {
    assertNonEmpty(cardToken, 'cardToken');
    return this.issuerApi.freezeCard(cardToken);
  }

  unfreeze(cardToken: string): Promise<void> {
    assertNonEmpty(cardToken, 'cardToken');
    return this.issuerApi.unfreezeCard(cardToken);
  }
}
