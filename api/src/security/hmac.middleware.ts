import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SECRET = process.env.HMAC_SECRET || '';

export function verifyHmac(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);

    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');

    if (!signature || signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'HMAC verification failed' });
  }
}
