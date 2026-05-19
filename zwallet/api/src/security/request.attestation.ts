import crypto from 'crypto';

export function verifyAttestation(token: string, publicKey: string): boolean {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(token);
    return verifier.verify(publicKey, token, 'base64');
  } catch {
    return false;
  }
}
