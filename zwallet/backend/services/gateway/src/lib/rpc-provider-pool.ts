export type RpcMethodClass = 'critical' | 'nonCritical';
export type BreakerState = 'closed' | 'open' | 'half_open';

export type RpcProvider = {
  id: string;
  call: (method: string, params?: unknown[]) => Promise<unknown>;
};

export type RpcPoolMetrics = {
  onCall?: (event: { providerId: string; method: string; latencyMs: number; ok: boolean; breaker: BreakerState }) => void;
  onQuorumDisagreement?: (event: { method: string; responses: unknown[] }) => void;
};

export class RpcProviderPool {
  private health = new Map<string, { failures: number; state: BreakerState; openUntil: number }>();
  constructor(private providers: RpcProvider[], private quorum = 2, private metrics: RpcPoolMetrics = {}) {
    for (const p of providers) this.health.set(p.id, { failures: 0, state: 'closed', openUntil: 0 });
  }
  private classify(method: string): RpcMethodClass {
    return ['eth_getBalance', 'eth_getTransactionCount', 'eth_blockNumber'].includes(method) ? 'critical' : 'nonCritical';
  }
  private isAvailable(id: string): boolean {
    const h = this.health.get(id)!;
    if (h.state === 'open' && Date.now() > h.openUntil) h.state = 'half_open';
    return h.state !== 'open';
  }
  private markResult(id: string, ok: boolean) {
    const h = this.health.get(id)!;
    if (ok) { h.failures = 0; h.state = 'closed'; return; }
    h.failures += 1;
    if (h.failures >= 2) { h.state = 'open'; h.openUntil = Date.now() + 500; }
  }
  async call(method: string, params: unknown[] = []): Promise<unknown> {
    const cls = this.classify(method);
    const active = this.providers.filter(p => this.isAvailable(p.id));
    if (!active.length) throw new Error('rpc_pool_unavailable');

    if (cls === 'critical') {
      const settled = await Promise.allSettled(active.map(async (p) => {
        const started = Date.now();
        try {
          const value = await this.retry(() => p.call(method, params));
          this.metrics.onCall?.({ providerId: p.id, method, latencyMs: Date.now() - started, ok: true, breaker: this.health.get(p.id)!.state });
          this.markResult(p.id, true);
          return { ok: true as const, value };
        } catch {
          this.metrics.onCall?.({ providerId: p.id, method, latencyMs: Date.now() - started, ok: false, breaker: this.health.get(p.id)!.state });
          this.markResult(p.id, false);
          return { ok: false as const };
        }
      }));

      const results: unknown[] = [];
      for (const entry of settled) {
        if (entry.status === 'fulfilled' && entry.value.ok) results.push(entry.value.value);
      }

      const groups = new Map<string, { value: unknown; count: number }>();
      for (const r of results) {
        const k = JSON.stringify(r);
        groups.set(k, { value: r, count: (groups.get(k)?.count ?? 0) + 1 });
      }
      const winner = [...groups.values()].sort((a, b) => b.count - a.count)[0];
      if (!winner || winner.count < this.quorum) {
        this.metrics.onQuorumDisagreement?.({ method, responses: results });
        throw new Error('quorum_not_reached');
      }
      return winner.value;
    }

    for (const p of active) {
      const started = Date.now();
      try {
        const r = await this.retry(() => p.call(method, params));
        this.metrics.onCall?.({ providerId: p.id, method, latencyMs: Date.now() - started, ok: true, breaker: this.health.get(p.id)!.state });
        this.markResult(p.id, true);
        return r;
      } catch {
        this.metrics.onCall?.({ providerId: p.id, method, latencyMs: Date.now() - started, ok: false, breaker: this.health.get(p.id)!.state });
        this.markResult(p.id, false);
      }
    }
    throw new Error('rpc_fallback_exhausted');
  }
  private async retry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    let attempt = 0;
    while (true) {
      try { return await fn(); } catch (e) {
        if (attempt >= retries) throw e;
        const delay = Math.min(100 * (2 ** attempt), 400) + Math.floor(Math.random() * 10);
        await new Promise(r => setTimeout(r, delay));
        attempt += 1;
      }
    }
  }
}
