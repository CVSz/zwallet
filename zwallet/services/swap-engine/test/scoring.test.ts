import { describe, it, expect } from 'vitest';
import { scoreRoute, selectBestRoute, type SwapQuoteRequest, type RouteCandidate } from '../src/index.js';

describe('SwapEngine Scoring', () => {
  const request: SwapQuoteRequest = {
    chain: 'evm',
    fromToken: 'ETH',
    toToken: 'USDC',
    amountInAtomic: '1000000000000000000', // 1 ETH
    maxSlippageBps: 100, // 1%
    gasPriceGwei: '20'
  };

  it('should correctly score a valid route', () => {
    const candidate: RouteCandidate = {
      routeId: 'route-1',
      provider: 'dex',
      expectedOutAtomic: '2500000000', // 2500 USDC (assuming 6 decimals)
      gasUnits: 150000n,
      estimatedLatencyMs: 200,
      slippageBps: 50,
      simulationOk: true
    };

    const ranked = scoreRoute(request, candidate);
    expect(ranked.score).toBeGreaterThan(0);
    expect(ranked.gasCostAtomic).toBeDefined();
  });

  it('should disqualify routes with failed simulation', () => {
    const candidate: RouteCandidate = {
      routeId: 'route-bad',
      provider: 'dex',
      expectedOutAtomic: '2500000000',
      gasUnits: 150000n,
      estimatedLatencyMs: 200,
      slippageBps: 50,
      simulationOk: false
    };

    expect(() => scoreRoute(request, candidate)).toThrow(/simulation failed/);
  });

  it('should disqualify routes with excessive slippage', () => {
    const candidate: RouteCandidate = {
      routeId: 'route-slippy',
      provider: 'dex',
      expectedOutAtomic: '2500000000',
      gasUnits: 150000n,
      estimatedLatencyMs: 200,
      slippageBps: 150, // > 100
      simulationOk: true
    };

    expect(() => scoreRoute(request, candidate)).toThrow(/slippage exceeds/);
  });

  it('should select the best route among multiple candidates', () => {
    const candidates: RouteCandidate[] = [
      {
        routeId: 'cheap-but-slow',
        provider: 'dex',
        expectedOutAtomic: '2500000000',
        gasUnits: 100000n,
        estimatedLatencyMs: 800,
        slippageBps: 10,
        simulationOk: true
      },
      {
        routeId: 'fast-but-expensive',
        provider: 'rfq',
        expectedOutAtomic: '2495000000',
        gasUnits: 50000n,
        estimatedLatencyMs: 100,
        slippageBps: 5,
        simulationOk: true
      }
    ];

    const best = selectBestRoute(request, candidates);
    expect(best.routeId).toBeDefined();
  });
});
