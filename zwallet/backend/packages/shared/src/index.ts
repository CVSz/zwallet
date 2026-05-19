export type Chain = 'evm' | 'solana' | 'bitcoin';

export interface TenantContext {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  region: string;
}

export interface ServiceHealth {
  service: string;
  status: 'ok' | 'degraded';
  timestamp: string;
}

export const nowIso = () => new Date().toISOString();

export * from './wallet-engine.js';

export * from './indexer.js';
