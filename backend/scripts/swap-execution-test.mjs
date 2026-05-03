#!/usr/bin/env node

const baseUrl = process.env.GATEWAY_URL ?? 'http://localhost:8080';
const email = `swap-flow-${Date.now()}@example.com`;
const password = 'password123';
const deviceId = 'android-device-001';

const req = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, options);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  console.log('1) Register + login');
  await req('/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId }),
  });

  const login = await req('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId }),
  });

  assert(login.ok, `Login failed: ${JSON.stringify(login.body)}`);
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${login.body.accessToken}`,
  };

  console.log('2) Execute wallet -> sign -> swap -> index -> display flow');
  const flow = await req('/v1/flow/wallet-sign-swap', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      chain: 'ethereum',
      fromToken: 'USDC',
      toToken: 'ETH',
      amount: '100',
      slippageBps: 75,
    }),
  });

  assert(flow.ok, `Flow request failed (${flow.status}): ${JSON.stringify(flow.body)}`);
  assert(flow.body.wallet?.address, 'Missing wallet address in flow response');
  assert(flow.body.quote?.routeId, 'Missing quote routeId in flow response');
  assert(flow.body.execution?.tx?.hash, 'Missing execution tx hash in flow response');

  console.log('Flow success:', JSON.stringify({
    wallet: flow.body.wallet.address,
    routeId: flow.body.quote.routeId,
    txHash: flow.body.execution.tx.hash,
    stages: flow.body.flow,
  }, null, 2));
};

run().catch((err) => {
  console.error('Swap execution test failed.');
  console.error(err);
  process.exit(1);
});
