// api/src/app.ts
import express from 'express';
import bodyParser from 'body-parser';
import { verifyHmacV2 } from './security/hmac.v2.middleware';

const app = express();
app.use(bodyParser.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Wallet
const balances = new Map<string, number>();
const allowedUserId = /^[a-zA-Z0-9:_-]{1,64}$/;
const readBalance = (userId: string) => balances.get(userId) ?? 0;
const writeBalance = (userId: string, value: number) => balances.set(userId, value);
const isValidUserId = (userId: unknown): userId is string => typeof userId === 'string' && allowedUserId.test(userId);

app.get('/wallet/balance', verifyHmacV2, (req, res) => {
  const user = req.headers['x-user-id'] as string;
  if (!isValidUserId(user)) return res.status(400).json({ error: 'Invalid user id' });
  res.json({ balance: readBalance(user) });
});

app.post('/wallet/transfer', verifyHmacV2, (req, res) => {
  const { from, to, amount } = req.body;

  if (!isValidUserId(from) || !isValidUserId(to) || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (readBalance(from) < amount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  writeBalance(from, readBalance(from) - amount);
  writeBalance(to, readBalance(to) + amount);

  res.json({ success: true });
});

// Deposit (mock PromptPay)
app.post('/deposit/promptpay', verifyHmacV2, (req, res) => {
  const { userId, amount } = req.body;
  if (!isValidUserId(userId) || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid' });

  writeBalance(userId, readBalance(userId) + amount);
  res.json({ status: 'completed' });
});

// Withdraw (mock)
app.post('/withdraw/promptpay', verifyHmacV2, (req, res) => {
  const { userId, amount } = req.body;
  if (!isValidUserId(userId) || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid' });
  }

  if (readBalance(userId) < amount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  writeBalance(userId, readBalance(userId) - amount);
  res.json({ status: 'processing' });
});

export default app;
