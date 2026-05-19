import { test, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';

/**
 * End-to-End Transaction Flow Test
 * Validates the orchestration between Gateway, MPC, and AA services.
 */
test('E2E: Full MPC-Signed AA Transaction Flow', async () => {
  const app = buildApp();
  await app.ready();
  
  // 1. Authenticate (Mocked)
  const tokens = await (app as any).mintTokens('user-1', 'device-1');
  
  // 2. Request MPC Signing Ceremony
  const mpcRes = await app.inject({
    method: 'POST',
    url: '/v1/mpc/sign-transaction',
    headers: { 
      authorization: `Bearer ${tokens.accessToken}`,
      'content-type': 'application/json',
      'x-nonce': `nonce_${Math.random()}`
    },
    body: {
      payload: '0x1234',
      threshold: 2,
      participants: ['node-1', 'device-1'],
      attestationToken: 'attest_secure_enclave_valid_token'
    }
  });
  
  expect(mpcRes.statusCode).toBe(200);
  const { mpcRequestId } = mpcRes.json();
  
  // 3. Submit UserOperation via AA Orchestrator
  const aaRes = await app.inject({
    method: 'POST',
    url: '/v1/aa/user-operations',
    headers: { 
      authorization: `Bearer ${tokens.accessToken}`,
      'content-type': 'application/json',
      'x-nonce': `nonce_${Math.random()}`
    },
    body: {
      sender: '0xsender',
      target: '0xtarget',
      value: '1000000000000000000', // 1 ETH
      mpcSignatureId: mpcRequestId
    }
  });
  
  expect(aaRes.statusCode).toBe(200);
  expect(aaRes.json().userOpHash).toBeDefined();
  
  // 4. Verify Audit Log Persistence
  const auditRes = await app.inject({
    method: 'GET',
    url: '/v1/audit-logs',
    headers: { 
      authorization: `Bearer ${tokens.accessToken}`,
      'x-nonce': `nonce_${Math.random()}`
    }
  });
  
  const auditActions = auditRes.json().items.map((i: any) => i.action);
  expect(auditActions).toContain('mpc.sign');
  expect(auditActions).toContain('aa.userop');
});
