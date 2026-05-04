import { z } from 'zod';

export const userOpSchema = z.object({ idempotencyKey: z.string().min(4), chainId: z.number().int().positive(), sender: z.string().min(5), nonce: z.number().int().nonnegative(), callData: z.string().min(2) });
export type UserOpStatus = 'created' | 'simulated' | 'submitted' | 'confirmed' | 'failed';

export type BundlerClient = {
  simulate: (op: any) => Promise<{ ok: boolean; reason?: string; gasEstimate?: number }>;
  submit: (op: any) => Promise<{ userOpHash: string }>;
  getStatus: (userOpHash: string) => Promise<UserOpStatus>;
};

export class InMemoryBundlerClient implements BundlerClient {
  private state = new Map<string, UserOpStatus>();
  async simulate(op: any) { if (String(op.callData).includes('fail')) return { ok: false, reason: 'simulation_failed' }; return { ok: true, gasEstimate: 21000 }; }
  async submit(op: any) { const hash = `0xop${op.idempotencyKey}`; this.state.set(hash, 'submitted'); return { userOpHash: hash }; }
  async getStatus(hash: string) { return this.state.get(hash) ?? 'failed'; }
}

export class UserOperationService {
  private byKey = new Map<string, string>();
  constructor(private bundler: BundlerClient, private readonly maxGas = 7000000) {}
  async createAndSubmit(raw: unknown) {
    const parsed = userOpSchema.parse(raw);
    if (this.byKey.has(parsed.idempotencyKey)) return { userOpHash: this.byKey.get(parsed.idempotencyKey)!, deduped: true };
    const sim = await this.bundler.simulate(parsed);
    if (!sim.ok) throw new Error(sim.reason ?? 'simulation_failed');
    if ((sim.gasEstimate ?? 0) > this.maxGas) throw new Error('gas_threshold_exceeded');
    const submitted = await this.bundler.submit(parsed);
    this.byKey.set(parsed.idempotencyKey, submitted.userOpHash);
    return { ...submitted, deduped: false };
  }
  async status(userOpHash: string) { return this.bundler.getStatus(userOpHash); }
}
