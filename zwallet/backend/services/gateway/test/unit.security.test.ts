import { describe, expect, it } from 'vitest';
import { deviceBindSchema, loginSchema, lifecycleCreateSchema, refreshSchema } from '../src/schemas/index.js';

describe('unit: core schema logic', () => {
  it('rejects invalid login payload', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });


  it('rejects malformed refresh token payload', () => {
    const result = refreshSchema.safeParse({ refreshToken: 'short' });
    expect(result.success).toBe(false);
  });

  it('accepts valid device bind payload', () => {
    const result = deviceBindSchema.safeParse({ userId: '550e8400-e29b-41d4-a716-446655440000', deviceId: 'device-1234' });
    expect(result.success).toBe(true);
  });

  it('accepts valid lifecycle payload', () => {
    const result = lifecycleCreateSchema.safeParse({ chain: 'evm', from: '0xabcde', to: '0xfedcb', value: '1', signatureHex: 'abcdef1234' });
    expect(result.success).toBe(true);
  });
});
