import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, resetStore } from './helpers.js';

vi.mock('../src/plugins/security.js', () => ({
  securityPlugin: async (app: any) => {
    app.decorate('authenticate', async (req: any) => { req.user = { sub: 'user-1' }; });
    app.decorate('mintTokens', async () => ({ accessToken: 'token', refreshToken: 'refresh' }));
    app.decorate('rotateRefreshToken', async () => ({ accessToken: 'token2', refreshToken: 'refresh2' }));
  }
}));

import { buildApp } from '../src/app.js';

describe.skip('gateway api smoke', () => {
  beforeEach(() => resetStore());

  it('create wallet metadata', async () => {
    const redis = fakeRedis();
    const app = buildApp({ rateLimiter: redis as any, cache: redis as any });
    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: 'Bearer token' }, payload: { walletLabel: 'main', network: 'solana', address: '0xabc123456789' } });
    expect(wallet.statusCode).toBe(200);
    await app.close();
  });
});
