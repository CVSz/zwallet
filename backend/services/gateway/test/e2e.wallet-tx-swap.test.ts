import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, resetStore } from './helpers.js';

import { buildApp } from '../src/app.js';

describe('e2e: create wallet, send transaction, swap token', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => ({ quote: { routeId: 'route-1' }, tx: { hash: '0xtxhash' }, address: '0xwallet1', allowed: true, assets: [], valid: true, queued: true }) } as Response)));
  });
  afterEach(() => { vi.unstubAllGlobals(); global.fetch = originalFetch; });

  it('runs wallet -> transaction -> swap flow', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const app = buildApp({ rateLimiter: fakeRedis() as any, cache: fakeRedis() as any });
    await app.ready();
    const token = await app.jwt.sign({ sub: 'user-1', deviceId: 'device-1', typ: 'access' });
    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'n1' }, payload: { walletLabel: 'e2e', network: 'evm', address: '0xsender' } });
    expect(wallet.statusCode, wallet.body).toBe(200);
    const tx = await app.inject({ method: 'POST', url: '/v1/transactions/lifecycle', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'n2' }, payload: { chain: 'evm', from: '0xsender', to: '0xreceiver', value: '10', signatureHex: 'abcdef123456' } });
    expect(tx.statusCode).toBe(200);
    const swap = await app.inject({ method: 'POST', url: '/v1/flow/wallet-sign-swap', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'n3' }, payload: { chain: 'ethereum', fromToken: 'USDC', toToken: 'ETH', amount: '100', slippageBps: 50 } });
    expect(swap.statusCode).toBe(200);
    await app.close();
  });
});
