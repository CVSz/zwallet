// api/src/infrastructure/webhook.handler.ts
import crypto from 'crypto';
import { confirmDeposit } from '../application/deposit.usecase';

const SECRET = process.env.WEBHOOK_SECRET || '';

export async function handleWebhook(body: any, signature: string) {
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  if (signature !== expected) {
    throw new Error('Invalid webhook signature');
  }

  const { txId, userId, amount } = body;

  return await confirmDeposit(txId, userId, amount);
}
