import Fastify from 'fastify';
import cors from '@fastify/cors';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { loginSchema, priceSchema, registerSchema, swapRequestSchema, txIndexSchema, walletMetadataSchema } from './schemas/index.js';
import { store } from './utils/store.js';
import { securityPlugin } from './plugins/security.js';

type Deps = { rateLimiter?: { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<number> }; cache?: { get: (k: string) => Promise<string | null>; setex: (k: string, s: number, v: string) => Promise<unknown> } };

export const buildApp = (deps: Deps = {}) => {
  const app = Fastify({ logger: false });
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });
  const prisma = new PrismaClient();
  const rateLimiter = deps.rateLimiter ?? (redis as any);
  const cache = deps.cache ?? (redis as any);

  app.decorate('prisma', prisma);
  app.register(cors, { origin: true });
  app.decorate('replay', store.replayTokens);
  app.decorate('revokedRefreshTokens', new Set<string>());
  app.decorate('rateLimiter', rateLimiter as any);
  app.register(securityPlugin);

  const authGuard = async (req: any, reply: any) => app.authenticate(req, reply);
  app.setErrorHandler((error, _req, reply) => reply.code(500).send({ error: 'Internal server error', detail: error.message }));
  app.get('/health', async () => ({ service: 'gateway', status: 'ok' }));
  app.post('/v1/auth/register', async (req, reply) => { const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const userId = crypto.randomUUID(); store.users.set(parsed.data.email, { id: userId, email: parsed.data.email, password: parsed.data.password }); store.devices.set(userId, new Set([parsed.data.deviceId])); store.audit.push({ action: 'auth.register', userId, payload: parsed.data }); return reply.send({ userId }); });

  app.post('/v1/auth/refresh', async (req: any, reply) => { const refreshToken = req.body?.refreshToken; if (!refreshToken || typeof refreshToken !== 'string') return reply.code(400).send({ error: 'refreshToken is required' }); try { return await app.rotateRefreshToken(refreshToken); } catch { return reply.code(401).send({ error: 'Invalid refresh token' }); } });
  app.post('/v1/auth/login', async (req, reply) => { const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const user = store.users.get(parsed.data.email); if (!user || user.password !== parsed.data.password) return reply.code(401).send({ error: 'Invalid credentials' }); if (!store.devices.get(user.id)?.has(parsed.data.deviceId)) return reply.code(403).send({ error: 'Unbound device' }); const tokens = await app.mintTokens(user.id, parsed.data.deviceId); store.audit.push({ action: 'auth.login', userId: user.id, payload: { deviceId: parsed.data.deviceId } }); return tokens; });
  app.post('/v1/wallet-metadata', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = walletMetadataSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const item = { id: crypto.randomUUID(), userId: req.user.sub, ...parsed.data }; store.wallets.push(item); store.audit.push({ action: 'wallet.create', userId: req.user.sub, payload: item }); return item; });
  app.post('/v1/transactions/index', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = txIndexSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const entry = { ...parsed.data, indexedAt: new Date().toISOString() }; store.txIndex.push(entry); store.audit.push({ action: 'tx.index', userId: req.user.sub, payload: entry }); return { indexed: true, entry }; });
  app.post('/v1/swaps/orchestrate', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = swapRequestSchema.safeParse(req.body); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const swap = { id: crypto.randomUUID(), ...parsed.data, status: 'quoted' }; store.swaps.push(swap); store.audit.push({ action: 'swap.orchestrate', userId: req.user.sub, payload: swap }); return swap; });
  app.get('/v1/prices/:symbol', { preHandler: [authGuard] }, async (req: any, reply) => { const parsed = priceSchema.safeParse(req.params); if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() }); const cacheKey = `price:${parsed.data.symbol}`; const hit = await cache.get(cacheKey); if (hit) return { symbol: parsed.data.symbol, price: Number(hit), source: 'cache' }; const price = Number((Math.random() * 1000).toFixed(2)); await cache.setex(cacheKey, 15, String(price)); store.audit.push({ action: 'price.read', userId: req.user.sub, payload: { symbol: parsed.data.symbol, price } }); return { symbol: parsed.data.symbol, price, source: 'oracle' }; });
  app.get('/v1/audit-logs', { preHandler: [authGuard] }, async () => ({ items: store.audit }));
  return app;
};

declare module 'fastify' { interface FastifyInstance { prisma: PrismaClient; } }
