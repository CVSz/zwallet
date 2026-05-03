import { store } from '../src/utils/store.js';

export const fakeRedis = () => {
  const map = new Map<string, string>();
  const counter = new Map<string, number>();
  return {
    get: async (k: string) => map.get(k) ?? null,
    setex: async (k: string, _s: number, v: string) => map.set(k, v),
    incr: async (k: string) => { const n = (counter.get(k) ?? 0) + 1; counter.set(k, n); return n; },
    expire: async () => 1
  };
};

export const resetStore = () => {
  store.users.clear();
  store.devices.clear();
  store.replayTokens.clear();
  store.wallets.length = 0;
  store.audit.length = 0;
  store.txIndex.length = 0;
  store.swaps.length = 0;
  store.balances.clear();
  store.lifecycleTx.clear();
};

export const registerAndLogin = async (app: any) => {
  await app.inject({ method: 'POST', url: '/v1/auth/register', headers: { 'x-nonce': 'reg-nonce' }, payload: { email: 'test@zwallet.dev', password: 'password1', deviceId: 'device-1' } });
  const login = await app.inject({ method: 'POST', url: '/v1/auth/login', headers: { 'x-nonce': 'login-nonce' }, payload: { email: 'test@zwallet.dev', password: 'password1', deviceId: 'device-1' } });
  return login.json().accessToken as string;
};
