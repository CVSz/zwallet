import { describe, expect, it } from 'vitest';
import { loginSchema, lifecycleCreateSchema } from '../src/schemas/index.js';

describe('unit: core schema logic', () => {
  it('rejects invalid login payload', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts valid lifecycle payload', () => {
    const result = lifecycleCreateSchema.safeParse({ chain: 'evm', from: '0xabcde', to: '0xfedcb', value: '1', signatureHex: 'abcdef1234', privateKeyHex: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
    expect(result.success).toBe(true);
  });
});
