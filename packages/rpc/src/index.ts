export type SupportedChain = 'evm' | 'solana' | 'btc';

export interface RpcProvider {
  id: string;
  chain: SupportedChain;
  url: string;
  priority?: number;
}

export interface RpcRequest {
  method: string;
  params?: unknown[];
}

export interface RpcResponse<T = unknown> {
  providerId: string;
  result: T;
  latencyMs: number;
}

export interface RpcClient {
  call<T>(request: RpcRequest, signal?: AbortSignal): Promise<T>;
}

export type RpcClientFactory = (provider: RpcProvider) => RpcClient;

interface ProviderRuntime {
  provider: RpcProvider;
  score: number;
  failures: number;
  cooldownUntil: number;
  inflight: number;
}

export class RpcCircuitOpenError extends Error {}

export class MultiRpcPool {
  private readonly runtimes: ProviderRuntime[];

  constructor(
    providers: RpcProvider[],
    private readonly clientFactory: RpcClientFactory,
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 15_000,
  ) {
    if (providers.length === 0) throw new Error('at least one rpc provider is required');
    this.runtimes = providers.map((provider) => ({ provider, score: provider.priority ?? 100, failures: 0, cooldownUntil: 0, inflight: 0 }));
  }

  async request<T>(request: RpcRequest, timeoutMs = 5_000): Promise<RpcResponse<T>> {
    const candidates = this.pickCandidates();
    let lastError: unknown;

    for (const runtime of candidates) {
      try {
        const response = await this.callProvider<T>(runtime, request, timeoutMs);
        this.onSuccess(runtime, response.latencyMs);
        return response;
      } catch (error) {
        lastError = error;
        this.onFailure(runtime);
      }
    }

    if (!candidates.length) {
      throw new RpcCircuitOpenError('all rpc providers are in cooldown');
    }

    throw new Error(`all rpc providers failed: ${String(lastError)}`);
  }

  getProviderHealth(): Array<{ id: string; chain: SupportedChain; score: number; failures: number; available: boolean }> {
    const now = Date.now();
    return this.runtimes.map((runtime) => ({
      id: runtime.provider.id,
      chain: runtime.provider.chain,
      score: runtime.score,
      failures: runtime.failures,
      available: runtime.cooldownUntil <= now,
    }));
  }

  private pickCandidates(): ProviderRuntime[] {
    const now = Date.now();
    return [...this.runtimes]
      .filter((runtime) => runtime.cooldownUntil <= now)
      .sort((a, b) => (b.score - a.score) || (a.inflight - b.inflight));
  }

  private async callProvider<T>(runtime: ProviderRuntime, request: RpcRequest, timeoutMs: number): Promise<RpcResponse<T>> {
    runtime.inflight += 1;
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const client = this.clientFactory(runtime.provider);
      const result = await client.call<T>(request, controller.signal);
      return {
        providerId: runtime.provider.id,
        result,
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
      runtime.inflight -= 1;
    }
  }

  private onSuccess(runtime: ProviderRuntime, latencyMs: number): void {
    runtime.failures = 0;
    const latencyScore = Math.max(1, 1_000 - latencyMs);
    runtime.score = Math.round((runtime.score * 0.7) + (latencyScore * 0.3));
  }

  private onFailure(runtime: ProviderRuntime): void {
    runtime.failures += 1;
    runtime.score = Math.max(1, Math.round(runtime.score * 0.7));
    if (runtime.failures >= this.failureThreshold) {
      runtime.cooldownUntil = Date.now() + this.cooldownMs;
      runtime.failures = 0;
    }
  }
}

export function createFetchRpcClient(provider: RpcProvider): RpcClient {
  return {
    async call<T>(request: RpcRequest, signal?: AbortSignal): Promise<T> {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: request.method, params: request.params ?? [] }),
        signal: signal ?? null,
      });

      if (!response.ok) {
        throw new Error(`rpc provider ${provider.id} request failed with ${response.status}`);
      }

      const payload = await response.json() as { error?: { message?: string }; result?: T };
      if (payload.error) {
        throw new Error(payload.error.message ?? `rpc provider ${provider.id} error`);
      }
      if (typeof payload.result === 'undefined') {
        throw new Error(`rpc provider ${provider.id} returned empty result`);
      }
      return payload.result;
    },
  };
}
