import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Redis } from 'ioredis';
import { deviceBindSchema, lifecycleCreateSchema, loginSchema, priceSchema, refreshSchema, registerSchema, swapRequestSchema, txIndexSchema, walletMetadataSchema } from './schemas/index.js';
import { store } from './utils/store.js';
import { securityPlugin } from './plugins/security.js';
import { createHash, randomUUID } from 'node:crypto';

type Deps = { rateLimiter?: { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<number> }; cache?: { get: (k: string) => Promise<string | null>; setex: (k: string, s: number, v: string) => Promise<unknown> } };

export const buildApp = (deps: Deps = {}) => {
  const app = Fastify({ logger: false });
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });
  const rateLimiter = deps.rateLimiter ?? (redis as any);
  const cache = deps.cache ?? (redis as any);

  app.register(cors, { origin: true });
  app.decorate('replay', store.replayTokens);
  app.decorate('rateLimiter', rateLimiter as any);
  app.register(securityPlugin);

  const authGuard = async (req: any, reply: any) => app.authenticate(req, reply);
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });
  app.get('/health', async () => ({ service: 'gateway', status: 'ok' }));
  app.post('/v1/auth/register', async (req, reply) => { const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const userId = randomUUID(); store.users.set(parsed.data.email, { id: userId, email: parsed.data.email, password: parsed.data.password }); store.devices.set(userId, new Set([parsed.data.deviceId])); store.audit.push({ action: 'auth.register', userId, payload: parsed.data }); return reply.send({ userId }); });

  app.post('/v1/auth/device/bind', async (req, reply) => { const parsed = deviceBindSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const existing = store.devices.get(parsed.data.userId) ?? new Set<string>(); existing.add(parsed.data.deviceId); store.devices.set(parsed.data.userId, existing); return { bound: true }; });
  app.post('/v1/auth/refresh', async (req: any, reply) => { const parsed = refreshSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); try { return await app.rotateRefreshToken(parsed.data.refreshToken); } catch { return reply.code(401).send({ error: 'Invalid refresh token' }); } });
  app.post('/v1/auth/login', async (req, reply) => { const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const user = store.users.get(parsed.data.email); if (!user || user.password !== parsed.data.password) return reply.code(401).send({ error: 'Invalid credentials' }); if (!store.devices.get(user.id)?.has(parsed.data.deviceId)) return reply.code(403).send({ error: 'Unbound device' }); const tokens = await app.mintTokens(user.id, parsed.data.deviceId); store.audit.push({ action: 'auth.login', userId: user.id, payload: { deviceId: parsed.data.deviceId } }); return tokens; });
  app.post('/v1/wallet-metadata', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = walletMetadataSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const item = { id: randomUUID(), userId: req.user.sub, ...parsed.data }; store.wallets.push(item); store.audit.push({ action: 'wallet.create', userId: req.user.sub, payload: item }); return item; });
  app.post('/v1/transactions/index', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = txIndexSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const entry = { ...parsed.data, indexedAt: new Date().toISOString() }; store.txIndex.push(entry); store.audit.push({ action: 'tx.index', userId: req.user.sub, payload: entry }); return { indexed: true, entry }; });
  app.post('/v1/swaps/orchestrate', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = swapRequestSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const swap = { id: randomUUID(), ...parsed.data, status: 'quoted' }; store.swaps.push(swap); store.audit.push({ action: 'swap.orchestrate', userId: req.user.sub, payload: swap }); return swap; });
  app.get('/v1/prices/:symbol', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = priceSchema.safeParse(req.params); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const cacheKey = `price:${parsed.data.symbol}`; const hit = await cache.get(cacheKey); if (hit) return { symbol: parsed.data.symbol, price: Number(hit), source: 'cache' }; const price = Number((Math.random() * 1000).toFixed(2)); await cache.setex(cacheKey, 15, String(price)); store.audit.push({ action: 'price.read', userId: req.user.sub, payload: { symbol: parsed.data.symbol, price } }); return { symbol: parsed.data.symbol, price, source: 'oracle' }; });
  app.get('/v1/audit-logs', { preHandler: [authGuard] }, async () => ({ items: store.audit }));

  app.post('/v1/transactions/lifecycle', { preHandler: [authGuard] }, async (req: any, reply) => {
    const parsed = lifecycleCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const txId = randomUUID();
    const txBase = process.env.TX_ORCHESTRATOR_URL ?? 'http://tx-orchestrator:8091';
    const indexerBase = process.env.INDEXER_SERVICE_URL ?? 'http://indexer-service:8093';

    const payload = {
      chain: parsed.data.chain,
      from: parsed.data.from,
      to: parsed.data.to,
      value: parsed.data.value,
      replayProtection: parsed.data.chain === 'evm'
        ? { chainId: 1 }
        : parsed.data.chain === 'solana'
          ? { recentBlockhash: 'recent-blockhash' }
          : { lockTime: Date.now() },
    };

    const state: Record<string, unknown> = {
      id: txId,
      userId: req.user.sub,
      payload,
      steps: [
        { step: 1, name: 'android_create_transaction', status: 'completed' },
        { step: 2, name: 'wallet_sign_locally', status: 'completed' },
      ],
      status: 'created',
    };

    const verifyRes = await fetch(`${txBase}/v1/tx/verify-signature`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload, signatureHex: parsed.data.signatureHex, signerId: parsed.data.from }),
    });
    if (!verifyRes.ok) {
      state.steps = [...(state.steps as any[]), { step: 3, name: 'backend_validate_request', status: 'failed', error: 'invalid_signature' }];
      state.status = 'failed';
      store.lifecycleTx.set(txId, state);
      return reply.code(400).send({ error: 'invalid_signature', txId, state });
    }

    state.steps = [...(state.steps as any[]), { step: 3, name: 'backend_validate_request', status: 'completed' }];
    const senderBalance = store.balances.get(parsed.data.from) ?? 100;
    const value = Number(parsed.data.value);
    if (!Number.isFinite(value) || value <= 0 || senderBalance < value) {
      state.steps = [...(state.steps as any[]), { step: 4, name: 'transaction_broadcast_to_chain', status: 'failed', error: 'insufficient_balance' }];
      state.status = 'failed';
      store.lifecycleTx.set(txId, state);
      return reply.code(400).send({ error: 'insufficient_balance', txId, state, available: senderBalance });
    }

    if (parsed.data.forceRpcFailure) {
      state.steps = [...(state.steps as any[]), { step: 4, name: 'transaction_broadcast_to_chain', status: 'failed', error: 'rpc_failure' }];
      state.status = 'failed';
      store.lifecycleTx.set(txId, state);
      return reply.code(502).send({ error: 'rpc_failure', txId, state });
    }

    const txHash = createHash('sha256').update(`${txId}:${Date.now()}`).digest('hex');
    state.steps = [...(state.steps as any[]), { step: 4, name: 'transaction_broadcast_to_chain', status: 'completed', txHash }];

    await fetch(`${indexerBase}/indexer/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobs: [{ idempotencyKey: `${txId}:${req.user.sub}`, chain: parsed.data.chain === 'evm' ? 'evm' : parsed.data.chain === 'solana' ? 'solana' : 'bitcoin', addresses: [parsed.data.from, parsed.data.to], cursor: txHash }] }),
    });

    state.steps = [...(state.steps as any[]), { step: 5, name: 'indexer_detects_transaction', status: 'completed' }];
    store.balances.set(parsed.data.from, senderBalance - value);
    store.balances.set(parsed.data.to, (store.balances.get(parsed.data.to) ?? 0) + value);

    state.steps = [...(state.steps as any[]), { step: 6, name: 'api_returns_updated_state', status: 'completed' }, { step: 7, name: 'android_reflects_state', status: 'completed' }];
    state.status = 'confirmed';
    state.updatedBalances = { from: store.balances.get(parsed.data.from), to: store.balances.get(parsed.data.to) };
    store.lifecycleTx.set(txId, state);

    return { txId, state };
  });

  app.get('/v1/transactions/lifecycle/:txId', { preHandler: [authGuard] }, async (req: any, reply) => {
    const tx = store.lifecycleTx.get(req.params.txId);
    if (!tx) return reply.code(404).send({ error: 'not_found' });
    return { txId: req.params.txId, state: tx };
  });

  app.post('/v1/flow/wallet-sign-swap', { preHandler: [authGuard] }, async (req: any, reply) => {
    const parsed = swapRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const walletBase = process.env.WALLET_SERVICE_URL ?? 'http://wallet-service:8090';
    const policyBase = process.env.POLICY_SERVICE_URL ?? 'http://policy-service:8094';
    const swapBase = process.env.SWAP_SERVICE_URL ?? 'http://swap-service:8092';
    const txBase = process.env.TX_ORCHESTRATOR_URL ?? 'http://tx-orchestrator:8091';
    const indexerBase = process.env.INDEXER_SERVICE_URL ?? 'http://indexer-service:8093';
    const portfolioBase = process.env.PORTFOLIO_SERVICE_URL ?? 'http://portfolio-service:8095';

    const walletRes = await fetch(`${walletBase}/v1/wallets/default`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: req.user.sub, chain: parsed.data.chain }) });
    const wallet = await walletRes.json();

    const policyRes = await fetch(`${policyBase}/v1/policy/pre-sign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: req.user.sub, chain: parsed.data.chain, amount: parsed.data.amount, fromToken: parsed.data.fromToken, toToken: parsed.data.toToken }) });
    const policy = await policyRes.json();
    if (!policyRes.ok) return reply.code(403).send({ stage: 'sign', policy });

    const quoteRes = await fetch(`${swapBase}/v1/swaps/quote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chain: parsed.data.chain, tokenIn: parsed.data.fromToken, tokenOut: parsed.data.toToken, amountIn: parsed.data.amount, slippageBps: parsed.data.slippageBps }) });
    const quoteBody = await quoteRes.json();
    if (!quoteRes.ok) return reply.code(400).send({ stage: 'swap', error: quoteBody });

    const routeId = quoteBody.quote?.routeId;
    const executeRes = await fetch(`${swapBase}/v1/swaps/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId, walletAddress: wallet.address }) });
    const executeBody = await executeRes.json();
    if (!executeRes.ok) return reply.code(400).send({ stage: 'broadcast', error: executeBody });

    const txHash = executeBody.tx?.hash;
    await fetch(`${indexerBase}/indexer/batch`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobs: [{ idempotencyKey: `${txHash}:${req.user.sub}`, chain: parsed.data.chain === 'solana' ? 'solana' : parsed.data.chain === 'bitcoin' ? 'bitcoin' : 'evm', addresses: [wallet.address], cursor: txHash }] }) });

    const portfolioRes = await fetch(`${portfolioBase}/v1/portfolio/display`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: req.user.sub, chain: parsed.data.chain, walletAddress: wallet.address, txHash }) });
    const portfolio = await portfolioRes.json();

    return { flow: ['wallet', 'sign', 'swap', 'broadcast', 'index', 'display'], wallet, policy, quote: quoteBody.quote, execution: executeBody, portfolio };
  });

  return app;
};
