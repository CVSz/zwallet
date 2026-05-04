import { MultiRpcPool, createFetchRpcClient, type RpcProvider } from '@zwallet/rpc';

const rpcProviders: RpcProvider[] = [
  { id: 'primary', chain: 'evm', url: process.env.RPC_EVM_PRIMARY ?? 'http://localhost:8545', priority: 120 },
  { id: 'secondary', chain: 'evm', url: process.env.RPC_EVM_SECONDARY ?? 'http://localhost:8546', priority: 100 },
  { id: 'solana-primary', chain: 'solana', url: process.env.RPC_SOLANA_PRIMARY ?? 'http://localhost:8899', priority: 110 },
  { id: 'btc-primary', chain: 'btc', url: process.env.RPC_BTC_PRIMARY ?? 'http://localhost:8332', priority: 110 },
];

export const rpcPool = new MultiRpcPool(rpcProviders, createFetchRpcClient);

export interface KycCheckRequest {
  userId: string;
  countryCode: string;
  legalName: string;
}

export interface KycCheckResult {
  profileId: string;
  status: 'approved' | 'pending' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface KycProvider {
  verifyIdentity(request: KycCheckRequest): Promise<KycCheckResult>;
}

export interface RiskEvaluationRequest {
  userId: string;
  operation: 'card_issue' | 'offramp';
  amountMinor: number;
  kycStatus: KycCheckResult['status'];
}

export interface RiskEvaluationResult {
  approved: boolean;
  reason?: string;
  score: number;
}

export class RiskEngine {
  evaluate(request: RiskEvaluationRequest): RiskEvaluationResult {
    if (!Number.isInteger(request.amountMinor) || request.amountMinor <= 0) {
      throw new Error('amountMinor must be a positive integer');
    }

    if (request.kycStatus !== 'approved') {
      return { approved: false, reason: 'KYC_NOT_APPROVED', score: 100 };
    }

    const baseScore = request.operation === 'offramp' ? 35 : 20;
    const volumeScore = Math.min(60, Math.floor(request.amountMinor / 10_000));
    const score = baseScore + volumeScore;

    if (score >= 80) {
      return { approved: false, reason: 'RISK_THRESHOLD_EXCEEDED', score };
    }

    return { approved: true, score };
  }
}

export class ComplianceService {
  constructor(private readonly kycProvider: KycProvider, private readonly riskEngine: RiskEngine) {}

  async runKycAndRisk(request: RiskEvaluationRequest & Omit<KycCheckRequest, 'userId'>): Promise<{ kyc: KycCheckResult; risk: RiskEvaluationResult }> {
    const kyc = await this.kycProvider.verifyIdentity({
      userId: request.userId,
      countryCode: request.countryCode,
      legalName: request.legalName
    });

    const risk = this.riskEngine.evaluate({
      userId: request.userId,
      operation: request.operation,
      amountMinor: request.amountMinor,
      kycStatus: kyc.status
    });

    return { kyc, risk };
  }
}
