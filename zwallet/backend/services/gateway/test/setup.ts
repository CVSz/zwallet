import { webcrypto } from 'node:crypto';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}
