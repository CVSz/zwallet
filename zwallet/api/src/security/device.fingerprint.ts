import crypto from 'crypto';

export function generateDeviceFingerprint(input: {
  userAgent: string;
  ip: string;
  deviceId?: string;
}): string {
  const raw = `${input.userAgent}:${input.ip}:${input.deviceId || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
