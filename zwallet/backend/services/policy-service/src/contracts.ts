export type PreSignRequest = {
  userId: string;
  chain: string;
  amount: string;
  destination: string;
};

export type PolicyControl = 'velocity-check' | 'address-risk-check' | 'chain-allowlist';

export type PreSignSuccess = {
  allowed: true;
  policyVersion: string;
  controls: PolicyControl[];
};

export type PreSignFailure = {
  allowed: false;
  reason: string;
  failureCode: 'INVALID_INPUT' | 'MANUAL_APPROVAL_REQUIRED' | 'CHAIN_NOT_ALLOWED';
};

export type PreSignResponse = PreSignSuccess | PreSignFailure;

export type PolicyEngine = {
  evaluatePreSign(input: PreSignRequest): PreSignResponse;
};
