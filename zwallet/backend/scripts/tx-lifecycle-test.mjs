#!/usr/bin/env node
import crypto from 'node:crypto';

const baseUrl = process.env.GATEWAY_URL ?? 'http://localhost:8080';
const email = `tx-flow-${Date.now()}@example.com`;
const password = 'password123';
const deviceId = 'android-device-001';

const req = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, options);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
};

const signPayload = (payload, signerId) => {
  const canonical = JSON.stringify(payload);
  return crypto.createHmac('sha256', Buffer.from(signerId)).update(canonical).digest('hex');
};

const run = async () => {
  console.log('1) Register + Login');
  await req('/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, deviceId }) });
  const login = await req('/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, deviceId }) });
  if (!login.ok) throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  const token = login.body.accessToken;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

  const from = '0xsender000000000000000000000000000000000001';
  const to = '0xreceiver0000000000000000000000000000000001';

  const mkPayload = (value) => ({ chain: 'evm', from, to, value, replayProtection: { chainId: 1 } });

  console.log('2) Happy path lifecycle');
  const payloadOk = mkPayload('10');
  const sigOk = signPayload(payloadOk, from);
  const okFlow = await req('/v1/transactions/lifecycle', { method: 'POST', headers, body: JSON.stringify({ ...payloadOk, signatureHex: sigOk }) });
  console.log(JSON.stringify(okFlow.body, null, 2));

  console.log('3) Invalid signature case');
  const badSig = await req('/v1/transactions/lifecycle', { method: 'POST', headers, body: JSON.stringify({ ...payloadOk, signatureHex: 'deadbeef' }) });
  console.log(JSON.stringify(badSig.body, null, 2));

  console.log('4) Insufficient balance case');
  const payloadBig = mkPayload('1000');
  const sigBig = signPayload(payloadBig, from);
  const insufficient = await req('/v1/transactions/lifecycle', { method: 'POST', headers, body: JSON.stringify({ ...payloadBig, signatureHex: sigBig }) });
  console.log(JSON.stringify(insufficient.body, null, 2));

  console.log('5) RPC failure case');
  const payloadRpc = mkPayload('5');
  const sigRpc = signPayload(payloadRpc, from);
  const rpcFail = await req('/v1/transactions/lifecycle', { method: 'POST', headers, body: JSON.stringify({ ...payloadRpc, signatureHex: sigRpc, forceRpcFailure: true }) });
  console.log(JSON.stringify(rpcFail.body, null, 2));
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
