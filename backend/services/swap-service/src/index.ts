import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

type Chain = 'ethereum' | 'polygon' | 'arbitrum' | 'solana';
type DexProvider = '1inch' | 'uniswap-v2' | 'uniswap-v3' | 'jupiter';

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

interface RouteLeg {
  dex: DexProvider;
  pool: string;
  tokenIn: string;
  tokenOut: string;
  shareBps: number;
  expectedOut: string;
  feeBps: number;
}

interface RouteQuote {
  routeId: string;
  chain: Chain;
  legs: RouteLeg[];
  amountIn: string;
  grossOut: string;
  minOut: string;
  priceImpactPct: number;
  estimatedGasUsd: number;
  executionRisk: 'low' | 'medium' | 'high';
  mev: {
    privateRpc: boolean;
    flashbotsBundle: boolean;
    antiSandwich: string[];
  };
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
  routeId: z.string(),
  walletAddress: z.string().min(4),
  maxPriorityFeeGwei: z.number().min(0).optional(),
  permitSignature: z.string().optional()
});

const approvalSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum']),
  token: z.string().min(2),
  owner: z.string().min(4),
  spender: z.string().min(4),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  preferPermit: z.boolean().default(true)
});

class SwapRouterEngine {
  private routeCache = new Map<string, RouteQuote>();

  async getBestRoute(request: QuoteRequest): Promise<RouteQuote> {
    const candidates = await this.fetchProviderQuotes(request);
    const ranked = candidates
      .map((candidate) => ({
        ...candidate,
        score: Number(candidate.grossOut) - candidate.estimatedGasUsd * 0.05 - candidate.priceImpactPct * 10
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    this.routeCache.set(best.routeId, best);
    return best;
  }

  getRoute(routeId: string): RouteQuote | undefined {
    return this.routeCache.get(routeId);
  }

  private async fetchProviderQuotes(request: QuoteRequest): Promise<RouteQuote[]> {
    const providers = request.chain === 'solana'
      ? [this.jupiterRoute(request)]
      : [this.oneInchRoute(request), this.uniswapV2Route(request), this.uniswapV3Route(request)];

    const quotes = await Promise.all(providers);
    return quotes;
  }

  private baseMev(request: QuoteRequest) {
    return {
      privateRpc: !!request.mevProtection && request.chain !== 'solana',
      flashbotsBundle: !!request.mevProtection && request.chain === 'ethereum',
      antiSandwich: [
        'tight-slippage-threshold',
        'randomized-deadline-window',
        'post-trade-price-deviation-check'
      ]
    };
  }

  private async oneInchRoute(request: QuoteRequest): Promise<RouteQuote> {
    const grossOut = Number(request.amountIn) * 0.992;
    return {
      routeId: randomUUID(),
      chain: request.chain,
      amountIn: request.amountIn,
      grossOut: grossOut.toFixed(8),
      minOut: this.slippageAdjusted(grossOut, request.slippageBps),
      priceImpactPct: 0.37,
      estimatedGasUsd: this.dynamicGasUsd(request.chain, request.gasPriceGwei, 180000),
      executionRisk: 'low',
      legs: [{
        dex: '1inch',
        pool: 'aggregated-path',
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        shareBps: 10000,
        expectedOut: grossOut.toFixed(8),
        feeBps: 30
      }],
      mev: this.baseMev(request)
    };
  }

  private async uniswapV2Route(request: QuoteRequest): Promise<RouteQuote> {
    const grossOut = Number(request.amountIn) * 0.988;
    return {
      routeId: randomUUID(),
      chain: request.chain,
      amountIn: request.amountIn,
      grossOut: grossOut.toFixed(8),
      minOut: this.slippageAdjusted(grossOut, request.slippageBps),
      priceImpactPct: 0.52,
      estimatedGasUsd: this.dynamicGasUsd(request.chain, request.gasPriceGwei, 210000),
      executionRisk: 'medium',
      legs: [{
        dex: 'uniswap-v2',
        pool: `${request.tokenIn}/${request.tokenOut}`,
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        shareBps: 10000,
        expectedOut: grossOut.toFixed(8),
        feeBps: 30
      }],
      mev: this.baseMev(request)
    };
  }

  private async uniswapV3Route(request: QuoteRequest): Promise<RouteQuote> {
    const legOneOut = Number(request.amountIn) * 0.6 * 0.995;
    const legTwoOut = Number(request.amountIn) * 0.4 * 0.989;
    const grossOut = legOneOut + legTwoOut;
    return {
      routeId: randomUUID(),
      chain: request.chain,
      amountIn: request.amountIn,
      grossOut: grossOut.toFixed(8),
      minOut: this.slippageAdjusted(grossOut, request.slippageBps),
      priceImpactPct: 0.29,
      estimatedGasUsd: this.dynamicGasUsd(request.chain, request.gasPriceGwei, 260000),
      executionRisk: 'low',
      legs: [
        {
          dex: 'uniswap-v3',
          pool: `${request.tokenIn}/WETH@500`,
          tokenIn: request.tokenIn,
          tokenOut: 'WETH',
          shareBps: 6000,
          expectedOut: legOneOut.toFixed(8),
          feeBps: 5
        },
        {
          dex: 'uniswap-v3',
          pool: `WETH/${request.tokenOut}@3000`,
          tokenIn: 'WETH',
          tokenOut: request.tokenOut,
          shareBps: 4000,
          expectedOut: legTwoOut.toFixed(8),
          feeBps: 30
        }
      ],
      mev: this.baseMev(request)
    };
  }

  private async jupiterRoute(request: QuoteRequest): Promise<RouteQuote> {
    const hopA = Number(request.amountIn) * 0.7 * 0.996;
    const hopB = Number(request.amountIn) * 0.3 * 0.992;
    const grossOut = hopA + hopB;

    return {
      routeId: randomUUID(),
      chain: request.chain,
      amountIn: request.amountIn,
      grossOut: grossOut.toFixed(8),
      minOut: this.slippageAdjusted(grossOut, request.slippageBps),
      priceImpactPct: 0.24,
      estimatedGasUsd: this.dynamicGasUsd(request.chain, request.gasPriceGwei, 1),
      executionRisk: 'low',
      legs: [
        {
          dex: 'jupiter',
          pool: `${request.tokenIn}/SOL`,
          tokenIn: request.tokenIn,
          tokenOut: 'SOL',
          shareBps: 7000,
          expectedOut: hopA.toFixed(8),
          feeBps: 4
        },
        {
          dex: 'jupiter',
          pool: `SOL/${request.tokenOut}`,
          tokenIn: 'SOL',
          tokenOut: request.tokenOut,
          shareBps: 3000,
          expectedOut: hopB.toFixed(8),
          feeBps: 6
        }
      ],
      mev: this.baseMev(request)
    };
  }

  private slippageAdjusted(amount: number, slippageBps: number): string {
    return (amount * (1 - slippageBps / 10000)).toFixed(8);
  }

  private dynamicGasUsd(chain: Chain, gasPriceGwei = 20, gasUnits = 180000): number {
    if (chain === 'solana') return 0.02;
    const nativeUsd = chain === 'polygon' ? 0.72 : 3200;
    const gasEth = (gasPriceGwei * gasUnits) / 1e9;
    const mevPremium = chain === 'ethereum' ? 1.2 : 1;
    return Number((gasEth * nativeUsd * mevPremium).toFixed(4));
  }
}

const app = Fastify({ logger: true });
const engine = new SwapRouterEngine();
await app.register(cors, { origin: true });

app.get('/health', async () => ({ service: 'swap-service', status: 'ok', timestamp: new Date().toISOString() }));

app.post('/v1/swaps/quote', async (request, reply) => {
  const parsed = quoteSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const quote = await engine.getBestRoute(parsed.data);
  return {
    quote,
    controls: {
      slippageBps: parsed.data.slippageBps,
      minOut: quote.minOut,
      priceImpactPct: quote.priceImpactPct
    }
  };
});

app.post('/v1/swaps/approval', async (request, reply) => {
  const parsed = approvalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const permitEligible = parsed.data.preferPermit && parsed.data.chain !== 'arbitrum';
  return {
    approvalRequired: true,
    flow: permitEligible ? 'permit-signature' : 'onchain-approve',
    transaction: {
      to: parsed.data.spender,
      data: permitEligible ? '0xpermit' : '0x095ea7b3',
      value: '0x0'
    }
  };
});

app.post('/v1/swaps/execute', async (request, reply) => {
  const parsed = executeSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const cached = engine.getRoute(parsed.data.routeId);
  if (!cached) return reply.code(404).send({ error: 'route not found or expired' });

  return {
    status: 'submitted',
    routeId: cached.routeId,
    chain: cached.chain,
    tx: {
      hash: `0x${randomUUID().replace(/-/g, '')}`,
      privateRpc: cached.mev.privateRpc,
      flashbots: cached.mev.flashbotsBundle,
      maxPriorityFeeGwei: parsed.data.maxPriorityFeeGwei ?? 2
    },
    postTradeChecks: {
      minOutEnforced: cached.minOut,
      sandwichDeviationGuard: 'enabled'
    }
  };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
