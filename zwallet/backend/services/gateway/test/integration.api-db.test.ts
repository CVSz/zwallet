import { beforeEach, describe, expect, it } from 'vitest';
import { fakeRedis, resetStore } from './helpers.js';
import { store } from '../src/utils/store.js';

import { buildApp } from '../src/app.js';

describe('integration: api + in-memory db store', () => {
  beforeEach(() => resetStore());

  it('creates wallet metadata and persists audit entry', async () => {
    const redis = fakeRedis();
    process.env.JWT_SECRET = 'test-secret';
    const app = buildApp({ rateLimiter: redis as any, cache: redis as any });
    await app.ready();
    const token = await app.jwt.sign({ sub: 'user-1', deviceId: 'device-1', typ: 'access' });
    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'n1' }, payload: { walletLabel: 'main', network: 'solana', address: '0xabc123456789' } });
    expect(wallet.statusCode, wallet.body).toBe(200);
    expect(store.wallets).toHaveLength(1);
    expect(store.audit.some((entry) => entry.action === 'wallet.create')).toBe(true);
    await app.close();
  });
});
