import { z } from 'zod';

export class MpcProviderUnavailableError extends Error {}
export class MpcConfigError extends Error {}
export class MpcPolicyDeniedError extends Error {}

export const mpcConfigSchema = z.object({ provider: z.enum(['sandbox']), timeoutMs: z.number().int().positive().default(500) });

export type MpcProvider = {
  createWallet: (userId: string) => Promise<{ walletId: string }>;
  getAddress: (walletId: string) => Promise<{ address: string }>;
  signTransaction: (walletId: string, payload: Record<string, unknown>) => Promise<{ signature: string }>;
  signMessage: (walletId: string, message: string) => Promise<{ signature: string }>;
  healthCheck: () => Promise<boolean>;
};

export class SandboxMpcProvider implements MpcProvider {
  async createWallet(userId: string) { return { walletId: `sandbox-${userId}` }; }
  async getAddress(walletId: string) { return { address: `0x${walletId.slice(0, 10).padEnd(10, '0')}` }; }
  async signTransaction(_walletId: string, payload: Record<string, unknown>) { if (payload.deny) throw new MpcPolicyDeniedError('policy_denied'); return { signature: '0xsandboxsig' }; }
  async signMessage() { return { signature: '0xsandboxmsgsig' }; }
  async healthCheck() { return true; }
}

export class MpcSignerService {
  constructor(private provider: MpcProvider) {}
  async signTransaction(walletId: string, payload: Record<string, unknown>) { return this.provider.signTransaction(walletId, payload); }
}
