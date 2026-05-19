import { z } from 'zod';

export const QuoteRequestSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana']),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  slippageBps: z.number().int().min(1).max(1000).default(50)
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const RouteQuoteSchema = z.object({
  routeId: z.string(),
  provider: z.string(),
  expectedOut: z.string(),
  priceImpactPct: z.number(),
  estimatedGasUsd: z.number(),
  score: z.number()
});

export type RouteQuote = z.infer<typeof RouteQuoteSchema>;
