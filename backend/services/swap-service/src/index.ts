import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

type Chain = 'ethereum' | 'polygon' | 'arbitrum' | 'solana';
type RouteSource = '1inch' | 'uniswap-v2' | 'uniswap-v3' | 'jupiter' | 'raydium';
type RiskLevel = 'low' | 'medium' | 'high';
type TxStepStatus = 'success' | 'failed' | 'skipped';

interface QuoteRequest {
  chain: Chain;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageBps: number;
  recipient?: string;
  gasPriceGwei?: number;
  mevProtection?: boolean;
}

interface NormalizedRouteLeg {
  source: RouteSource;
  pool: string;
  tokenIn: string;
  tokenOut: string;
  shareBps: number;
  expectedOut: string;
  feeBps: number;
}

interface NormalizedRoute {
  routeId: string;
  chain: Chain;
  source: RouteSource;
  amountIn: string;
  grossOut: string;
  minOut: string;
  estimatedGasUsd: number;
  priceImpactPct: number;
  slippageRisk: RiskLevel;
  executionRisk: RiskLevel;
  simulation: {
    ok: boolean;
    reason?: string;
    expectedBalanceDeltaOut: string;
  };
  legs: NormalizedRouteLeg[];
}

interface ExecutionAttempt {
  routeId: string;
  source: RouteSource;
  status: 'submitted' | 'failed';
  reason?: string;
  txHash?: string;
  steps: Array<{ name: string; status: TxStepStatus; detail: string }>;
}

const quoteSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana']),
  tokenIn: z.string().min(2),
  tokenOut: z.string().min(2),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/),
  slippageBps: z.number().int().min(1).max(2000).default(100),
  recipient: z.string().optional(),
  gasPriceGwei: z.number().min(0).optional(),
  mevProtection: z.boolean().default(true)
});

const executeSchema = z.object({
  quoteId: z.string(),
  walletAddress: z.string().min(4),
  maxPriorityFeeGwei: z.number().min(0).optional(),
  failSources: z.array(z.enum(['1inch', 'uniswap-v2', 'uniswap-v3', 'jupiter', 'raydium'])).optional()
});

class SwapRoutingEngine {
  private routeBook = new Map<string, NormalizedRoute[]>();

  async buildRoutes(request: QuoteRequest): Promise<{ quoteId: string; rankedRoutes: NormalizedRoute[] }> {
    const rawRoutes = await this.fetchRoutesFromAggregators(request);
    const normalized = rawRoutes.map((route) => this.normalizeRoute(route, request));
    const simulated = await Promise.all(normalized.map((route) => this.simulateRoute(route, request)));
    const viable = simulated.filter((route) => route.simulation.ok);
    const rankedRoutes = viable.sort((a, b) => this.routeScore(b) - this.routeScore(a));

    const quoteId = randomUUID();
    this.routeBook.set(quoteId, rankedRoutes);
    return { quoteId, rankedRoutes };
  }

  getQuoteRoutes(quoteId: string): NormalizedRoute[] {
    return this.routeBook.get(quoteId) ?? [];
  }

  private routeScore(route: NormalizedRoute): number {
    const outScore = Number(route.grossOut) * 100;
    const gasPenalty = route.estimatedGasUsd * 5;
    const slippagePenalty = route.slippageRisk === 'low' ? 1 : route.slippageRisk === 'medium' ? 8 : 20;
    return outScore - gasPenalty - slippagePenalty;
  }

  private async fetchRoutesFromAggregators(request: QuoteRequest): Promise<NormalizedRoute[]> {
    if (request.chain === 'solana') {
      return Promise.all([this.jupiter(request), this.raydium(request)]);
    }
    return Promise.all([this.oneInch(request), this.uniswapV2(request), this.uniswapV3(request)]);
  }

  private normalizeRoute(route: NormalizedRoute, request: QuoteRequest): NormalizedRoute {
    return {
      ...route,
      minOut: this.slippageAdjusted(Number(route.grossOut), request.slippageBps),
      slippageRisk: route.priceImpactPct <= 0.3 ? 'low' : route.priceImpactPct <= 0.8 ? 'medium' : 'high'
    };
  }

  private async simulateRoute(route: NormalizedRoute, request: QuoteRequest): Promise<NormalizedRoute> {
    const amount = Number(request.amountIn);
    const estimatedOut = Number(route.grossOut);
    if (amount <= 0 || estimatedOut <= 0) {
      return { ...route, simulation: { ok: false, reason: 'invalid amounts', expectedBalanceDeltaOut: '0' } };
    }

    if (route.estimatedGasUsd > estimatedOut * 0.35) {
      return { ...route, simulation: { ok: false, reason: 'gas too high vs output', expectedBalanceDeltaOut: route.grossOut } };
    }

    return { ...route, simulation: { ok: true, expectedBalanceDeltaOut: route.grossOut } };
  }

  private slippageAdjusted(amount: number, slippageBps: number): string {
    return (amount * (1 - slippageBps / 10000)).toFixed(8);
  }

  private gasUsd(chain: Chain, gasPriceGwei = 20, gasUnits = 180000): number {
    if (chain === 'solana') return 0.02;
    const nativeUsd = chain === 'polygon' ? 0.7 : 3200;
    const gasNative = (gasPriceGwei * gasUnits) / 1e9;
    return Number((gasNative * nativeUsd).toFixed(6));
  }

  private baseRoute(request: QuoteRequest, source: RouteSource, grossOut: number, gasUnits: number, priceImpactPct: number, legs: NormalizedRouteLeg[]): NormalizedRoute {
    return {
      routeId: randomUUID(),
      chain: request.chain,
      source,
      amountIn: request.amountIn,
      grossOut: grossOut.toFixed(8),
      minOut: grossOut.toFixed(8),
      estimatedGasUsd: this.gasUsd(request.chain, request.gasPriceGwei, gasUnits),
      priceImpactPct,
      slippageRisk: 'medium',
      executionRisk: priceImpactPct <= 0.35 ? 'low' : 'medium',
      simulation: { ok: true, expectedBalanceDeltaOut: grossOut.toFixed(8) },
      legs
    };
  }

  private async oneInch(request: QuoteRequest): Promise<NormalizedRoute> {
    const out = Number(request.amountIn) * 0.992;
    return this.baseRoute(request, '1inch', out, 170000, 0.28, [{ source: '1inch', pool: 'aggregated-path', tokenIn: request.tokenIn, tokenOut: request.tokenOut, shareBps: 10000, expectedOut: out.toFixed(8), feeBps: 30 }]);
  }

  private async uniswapV2(request: QuoteRequest): Promise<NormalizedRoute> {
    const out = Number(request.amountIn) * 0.988;
    return this.baseRoute(request, 'uniswap-v2', out, 210000, 0.49, [{ source: 'uniswap-v2', pool: `${request.tokenIn}/${request.tokenOut}`, tokenIn: request.tokenIn, tokenOut: request.tokenOut, shareBps: 10000, expectedOut: out.toFixed(8), feeBps: 30 }]);
  }

  private async uniswapV3(request: QuoteRequest): Promise<NormalizedRoute> {
    const hop1 = Number(request.amountIn) * 0.6 * 0.995;
    const hop2 = Number(request.amountIn) * 0.4 * 0.989;
    const out = hop1 + hop2;
    return this.baseRoute(request, 'uniswap-v3', out, 260000, 0.23, [
      { source: 'uniswap-v3', pool: `${request.tokenIn}/WETH@500`, tokenIn: request.tokenIn, tokenOut: 'WETH', shareBps: 6000, expectedOut: hop1.toFixed(8), feeBps: 5 },
      { source: 'uniswap-v3', pool: `WETH/${request.tokenOut}@3000`, tokenIn: 'WETH', tokenOut: request.tokenOut, shareBps: 4000, expectedOut: hop2.toFixed(8), feeBps: 30 }
    ]);
  }

  private async jupiter(request: QuoteRequest): Promise<NormalizedRoute> {
    const out = Number(request.amountIn) * 0.994;
    return this.baseRoute(request, 'jupiter', out, 1, 0.21, [{ source: 'jupiter', pool: 'jupiter-meta-route', tokenIn: request.tokenIn, tokenOut: request.tokenOut, shareBps: 10000, expectedOut: out.toFixed(8), feeBps: 4 }]);
  }

  private async raydium(request: QuoteRequest): Promise<NormalizedRoute> {
    const out = Number(request.amountIn) * 0.991;
    return this.baseRoute(request, 'raydium', out, 1, 0.38, [{ source: 'raydium', pool: `${request.tokenIn}/${request.tokenOut}`, tokenIn: request.tokenIn, tokenOut: request.tokenOut, shareBps: 10000, expectedOut: out.toFixed(8), feeBps: 25 }]);
  }
}

class SwapExecutionPipeline {
  async executeWithFallback(routes: NormalizedRoute[], walletAddress: string, failSources: RouteSource[] = []): Promise<{ status: 'submitted' | 'failed'; winner?: ExecutionAttempt; attempts: ExecutionAttempt[] }> {
    const attempts: ExecutionAttempt[] = [];

    for (const route of routes) {
      const attempt = await this.executeSingleRoute(route, walletAddress, failSources);
      attempts.push(attempt);
      if (attempt.status === 'submitted') {
        return { status: 'submitted', winner: attempt, attempts };
      }
    }

    return { status: 'failed', attempts };
  }

  private async executeSingleRoute(route: NormalizedRoute, walletAddress: string, failSources: RouteSource[]): Promise<ExecutionAttempt> {
    const steps: ExecutionAttempt['steps'] = [];

    if (route.chain !== 'solana') {
      steps.push({ name: 'approve-token-if-needed', status: 'success', detail: 'allowance satisfied or approve tx prepared' });
    } else {
      steps.push({ name: 'approve-token-if-needed', status: 'skipped', detail: 'solana swaps do not require erc20 approval' });
    }

    if (failSources.includes(route.source)) {
      steps.push({ name: 'sign-transaction', status: 'failed', detail: 'simulated signer rejection for fallback testing' });
      return { routeId: route.routeId, source: route.source, status: 'failed', reason: 'signing failure', steps };
    }

    steps.push({ name: 'sign-transaction', status: 'success', detail: `signed by ${walletAddress}` });
    steps.push({ name: 'broadcast', status: 'success', detail: 'transaction relayed to network' });

    return {
      routeId: route.routeId,
      source: route.source,
      status: 'submitted',
      txHash: `0x${randomUUID().replace(/-/g, '')}`,
      steps
    };
  }
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const routingEngine = new SwapRoutingEngine();
const executionPipeline = new SwapExecutionPipeline();

app.get('/health', async () => ({ service: 'swap-service', status: 'ok', timestamp: new Date().toISOString() }));

app.post('/v1/swaps/quote', async (request, reply) => {
  const parsed = quoteSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const result = await routingEngine.buildRoutes(parsed.data);
  if (result.rankedRoutes.length === 0) {
    return reply.code(422).send({ error: 'no viable routes after simulation' });
  }

  return {
    quoteId: result.quoteId,
    bestRoute: result.rankedRoutes[0],
    alternatives: result.rankedRoutes.slice(1),
    rankingPolicy: ['best-output', 'lowest-gas', 'lowest-slippage-risk']
  };
});

app.post('/v1/swaps/execute', async (request, reply) => {
  const parsed = executeSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const routes = routingEngine.getQuoteRoutes(parsed.data.quoteId);
  if (routes.length === 0) return reply.code(404).send({ error: 'quote not found or expired' });

  const execution = await executionPipeline.executeWithFallback(routes, parsed.data.walletAddress, parsed.data.failSources ?? []);
  if (execution.status === 'failed') {
    return reply.code(502).send({ status: execution.status, attempts: execution.attempts, error: 'all routes failed, fallback exhausted' });
  }

  return {
    status: execution.status,
    attemptCount: execution.attempts.length,
    selected: execution.winner,
    attempts: execution.attempts
  };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
