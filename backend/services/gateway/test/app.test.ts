import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { store } from '../src/utils/store.js';

const fakeRedis = () => {
  const map = new Map<string, string>();
  const counter = new Map<string, number>();
  return {
    get: async (k: string) => map.get(k) ?? null,
    setex: async (k: string, _s: number, v: string) => map.set(k, v),
    incr: async (k: string) => { const n = (counter.get(k) ?? 0) + 1; counter.set(k, n); return n; },
    expire: async () => 1
  };
};

beforeEach(() => {
  store.users.clear(); store.devices.clear(); store.replayTokens.clear(); store.wallets.length = 0; store.audit.length = 0;
});

describe('gateway api', () => {
  it('register/login and create wallet metadata', async () => {
    const redis = fakeRedis();
    const app = buildApp({ rateLimiter: redis as any, cache: redis as any });

    const nonce1 = 'n1';
    const reg = await app.inject({ method: 'POST', url: '/v1/auth/register', headers: { 'x-nonce': nonce1 }, payload: { email: 'a@b.com', password: 'password1', deviceId: 'device-1234' } });
    expect(reg.statusCode).toBe(200);

    const login = await app.inject({ method: 'POST', url: '/v1/auth/login', headers: { 'x-nonce': 'n2' }, payload: { email: 'a@b.com', password: 'password1', deviceId: 'device-1234' } });
    expect(login.statusCode).toBe(200);
    const token = login.json().accessToken;

    const wallet = await app.inject({ method: 'POST', url: '/v1/wallet-metadata', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'n3' }, payload: { walletLabel: 'main', network: 'solana', address: '0xabc123456789' } });
    expect(wallet.statusCode).toBe(200);

    await app.close();
  });

  it('blocks replay nonce', async () => {
    const redis = fakeRedis();
    const app = buildApp({ rateLimiter: redis as any, cache: redis as any });
    const headers = { 'x-nonce': 'same' };
    const first = await app.inject({ method: 'GET', url: '/health', headers });
    const second = await app.inject({ method: 'GET', url: '/health', headers });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    await app.close();
  });
});
