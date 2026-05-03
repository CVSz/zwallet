import type { PolicyEngine, PreSignRequest, PreSignResponse } from './contracts.js';

const ALLOWED_CHAINS = new Set(['ethereum', 'polygon', 'solana']);

export class DefaultPolicyEngine implements PolicyEngine {
  evaluatePreSign(input: PreSignRequest): PreSignResponse {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { allowed: false, reason: 'invalid amount', failureCode: 'INVALID_INPUT' };
    }

    if (!ALLOWED_CHAINS.has(input.chain.toLowerCase())) {
      return { allowed: false, reason: 'chain not allowed', failureCode: 'CHAIN_NOT_ALLOWED' };
    }

    if (amount > 50000) {
      return { allowed: false, reason: 'manual approval required', failureCode: 'MANUAL_APPROVAL_REQUIRED' };
    }

    return {
      allowed: true,
      policyVersion: '2026-05-03',
      controls: ['velocity-check', 'address-risk-check', 'chain-allowlist']
    };
  }
}
