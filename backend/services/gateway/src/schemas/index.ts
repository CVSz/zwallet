import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  deviceId: z.string().min(8)
});

export const loginSchema = registerSchema;

export const walletMetadataSchema = z.object({
  walletLabel: z.string().min(2),
  network: z.string().min(2),
  address: z.string().min(8)
});

export const txIndexSchema = z.object({
  chain: z.string(),
  blockNumber: z.number().int().nonnegative(),
  txHash: z.string().min(10)
});

export const swapRequestSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  amount: z.string(),
  slippageBps: z.number().int().min(1).max(1000)
});

export const priceSchema = z.object({
  symbol: z.string().min(2)
});
