import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SECRET = process.env.HMAC_SECRET || '';

function hashBody(body: unknown): string {
  const json = JSON.stringify(body, Object.keys(body as any).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

export function verifyHmacV2(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const nonce = req.headers['x-nonce'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!signature || !timestamp || !nonce || !userId) {
      return res.status(400).json({ error: 'Missing auth headers' });
    }

    const now = Date.now();
    const ts = parseInt(timestamp, 10);

    if (Math.abs(now - ts) > 30000) {
      return res.status(401).json({ error: 'Timestamp expired' });
    }

    const bodyHash = hashBody(req.body);

    const payload = `${req.method}:${req.originalUrl}:${timestamp}:${nonce}:${userId}:${bodyHash}`;

    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'HMAC v2 verification failed' });
  }
}
