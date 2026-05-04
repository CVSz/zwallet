import { describe, expect, it } from 'vitest';
import { RpcProviderPool } from '../src/lib/rpc-provider-pool.js';
import { buildApp } from '../src/app.js';
import { fakeRedis } from './helpers.js';

describe('rpc pool', () => {
  it('fails over provider outage for non-critical', async () => {
    const pool = new RpcProviderPool([{ id: 'a', call: async () => { throw new Error('down'); } }, { id: 'b', call: async () => 'ok' }], 2);
    await expect(pool.call('eth_chainId')).resolves.toBe('ok');
  });
  it('detects quorum disagreement for critical', async () => {
    const pool = new RpcProviderPool([{ id: 'a', call: async () => 1 }, { id: 'b', call: async () => 2 }, { id: 'c', call: async () => 3 }], 2);
    await expect(pool.call('eth_getBalance')).rejects.toThrow('quorum_not_reached');
  });

  it('runs critical quorum checks in parallel across providers', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const pool = new RpcProviderPool([
      { id: 'a', call: async () => { await delay(120); return 42; } },
      { id: 'b', call: async () => { await delay(120); return 42; } },
      { id: 'c', call: async () => { await delay(120); return 7; } }
    ], 2);

    const started = Date.now();
    await expect(pool.call('eth_getBalance')).resolves.toBe(42);
    expect(Date.now() - started).toBeLessThan(220);
  });
});

describe('mpc + aa endpoints', () => {
  it('handles policy denied and idempotent userops', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const app = buildApp({ rateLimiter: fakeRedis() as any, cache: fakeRedis() as any });
    await app.ready();
    const token = await app.jwt.sign({ sub: 'u1', deviceId: 'd1', typ: 'access' });
    const denied = await app.inject({ method: 'POST', url: '/v1/mpc/sign-transaction', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'm1' }, payload: { walletId: 'w1', deny: true } });
    expect(denied.statusCode).toBe(403);

    const payload = { idempotencyKey: 'k123', chainId: 1, sender: '0xabcde', nonce: 0, callData: '0x1234' };
    const a = await app.inject({ method: 'POST', url: '/v1/aa/user-operations', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'a1' }, payload });
    const b = await app.inject({ method: 'POST', url: '/v1/aa/user-operations', headers: { authorization: `Bearer ${token}`, 'x-nonce': 'a2' }, payload });
    expect(a.statusCode).toBe(200);
    expect(b.json().deduped).toBe(true);
    await app.close();
  });
});
