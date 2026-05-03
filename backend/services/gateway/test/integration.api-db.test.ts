import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis, resetStore } from './helpers.js';
import { store } from '../src/utils/store.js';

vi.mock('../src/plugins/security.js', () => ({
  securityPlugin: async (app: any) => {
    app.decorate('authenticate', async (req: any) => { req.user = { sub: 'user-1' }; });
    app.decorate('mintTokens', async () => ({ accessToken: 'token', refreshToken: 'refresh' }));
    app.decorate('rotateRefreshToken', async () => ({ accessToken: 'token2', refreshToken: 'refresh2' }));
  }
}));

import { buildApp } from '../src/app.js';

describe.skip('integration: api + in-memory db store', () => {
  beforeEach(() => resetStore());

  it('creates wallet metadata and persists audit entry', async () => {
    const redis = fakeRedis();
    const app = buildApp({ rateLimiter: redis as any, cache: redis as any });
    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: 'Bearer token' }, payload: { walletLabel: 'main', network: 'solana', address: '0xabc123456789' } });
    expect(wallet.statusCode).toBe(200);
    expect(store.wallets).toHaveLength(1);
    expect(store.audit.some((entry) => entry.action === 'wallet.create')).toBe(true);
    await app.close();
  });
});
