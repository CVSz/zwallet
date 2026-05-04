// api/src/app.ts
import express from 'express';
import bodyParser from 'body-parser';
import { verifyHmacV2 } from './security/hmac.v2.middleware';

const app = express();
app.use(bodyParser.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Wallet
let balances: Record<string, number> = {};

app.get('/wallet/balance', verifyHmacV2, (req, res) => {
  const user = req.headers['x-user-id'] as string;
  res.json({ balance: balances[user] || 0 });
});

app.post('/wallet/transfer', verifyHmacV2, (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if ((balances[from] || 0) < amount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  balances[from] -= amount;
  balances[to] = (balances[to] || 0) + amount;

  res.json({ success: true });
});

// Deposit (mock PromptPay)
app.post('/deposit/promptpay', verifyHmacV2, (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || amount <= 0) return res.status(400).json({ error: 'Invalid' });

  balances[userId] = (balances[userId] || 0) + amount;
  res.json({ status: 'completed' });
});

// Withdraw (mock)
app.post('/withdraw/promptpay', verifyHmacV2, (req, res) => {
  const { userId, amount } = req.body;

  if ((balances[userId] || 0) < amount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  balances[userId] -= amount;
  res.json({ status: 'processing' });
});

export default app;
