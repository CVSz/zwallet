import { z } from "zod";

export const HexSchema = z.string().regex(/^(0x)?[0-9a-fA-F]+$/);
export const PathSchema = z.string().regex(/^m(\/[0-9]+'?)+$/);

export const ChainAdapterSchema = z.object({
  chain: z.enum(["evm", "solana", "bitcoin"]),
  chainId: z.union([z.number().int().nonnegative(), z.string().min(1)]),
});

export type ChainAdapter = z.infer<typeof ChainAdapterSchema>;
