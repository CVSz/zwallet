import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, resetStore } from './helpers.js';

vi.mock('../src/plugins/security.js', () => ({
  securityPlugin: async (app: any) => {
    app.decorate('authenticate', async (req: any) => { req.user = { sub: 'user-1' }; });
    app.decorate('mintTokens', async () => ({ accessToken: 'token', refreshToken: 'refresh' }));
    app.decorate('rotateRefreshToken', async () => ({ accessToken: 'token2', refreshToken: 'refresh2' }));
  }
}));

import { buildApp } from '../src/app.js';

describe.skip('e2e: create wallet, send transaction, swap token', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => ({ quote: { routeId: 'route-1' }, tx: { hash: '0xtxhash' }, address: '0xwallet1', allowed: true, assets: [], valid: true, queued: true }) } as Response)));
  });
  afterEach(() => { vi.unstubAllGlobals(); global.fetch = originalFetch; });

  it('runs wallet -> transaction -> swap flow', async () => {
    const app = buildApp({ rateLimiter: fakeRedis() as any, cache: fakeRedis() as any });
    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: 'Bearer token' }, payload: { walletLabel: 'e2e', network: 'evm', address: '0xsender' } });
    expect(wallet.statusCode).toBe(200);
    const tx = await app.inject({ method: 'POST', url: '/v1/transactions/lifecycle', headers: { authorization: 'Bearer token' }, payload: { chain: 'evm', from: '0xsender', to: '0xreceiver', value: '10', signatureHex: 'abc123', privateKeyHex: 'def456' } });
    expect(tx.statusCode).toBe(200);
    const swap = await app.inject({ method: 'POST', url: '/v1/flow/wallet-sign-swap', headers: { authorization: 'Bearer token' }, payload: { chain: 'evm', fromToken: 'USDC', toToken: 'ETH', amount: '100', slippageBps: 50 } });
    expect(swap.statusCode).toBe(200);
    await app.close();
  });
});
