import { MultiRpcPool, createFetchRpcClient, type RpcProvider } from '@zwallet/rpc';

const rpcProviders: RpcProvider[] = [
  { id: 'primary', chain: 'evm', url: process.env.RPC_EVM_PRIMARY ?? 'http://localhost:8545', priority: 120 },
  { id: 'secondary', chain: 'evm', url: process.env.RPC_EVM_SECONDARY ?? 'http://localhost:8546', priority: 100 },
  { id: 'solana-primary', chain: 'solana', url: process.env.RPC_SOLANA_PRIMARY ?? 'http://localhost:8899', priority: 110 },
  { id: 'btc-primary', chain: 'btc', url: process.env.RPC_BTC_PRIMARY ?? 'http://localhost:8332', priority: 110 },
];

export const rpcPool = new MultiRpcPool(rpcProviders, createFetchRpcClient);

import { z } from "zod";

const IntentSchema = z.object({
  fromToken: z.string().min(1),
  toToken: z.string().min(1),
  amount: z.string().min(1),
  slippageBps: z.number().int().min(1).max(500),
  user: z.string().min(1),
});

const QuoteSchema = z.object({
  solver: z.string().min(1),
  outAmount: z.coerce.bigint(),
  gasEstimate: z.coerce.bigint(),
  calldata: z.string().min(1),
});

export type Quote = z.infer<typeof QuoteSchema>;

export class IntentRouter {
  constructor(private readonly solvers: string[]) {
    if (!solvers.length) throw new Error("At least one solver is required");
  }

  async fetchQuotes(intentRaw: unknown): Promise<Quote[]> {
    const intent = IntentSchema.parse(intentRaw);

    const settled = await Promise.allSettled(
      this.solvers.map(async (solver) => {
        const res = await fetch(`${solver}/quote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(intent),
        });

        if (!res.ok) throw new Error(`solver ${solver} failed`);
        return QuoteSchema.parse(await res.json());
      }),
    );

    const quotes = settled
      .filter((s): s is PromiseFulfilledResult<Quote> => s.status === "fulfilled")
      .map((s) => s.value);

    if (!quotes.length) throw new Error("All solvers failed");
    return quotes;
  }

  pickBest(quotes: Quote[]): Quote {
    if (!quotes.length) throw new Error("No quotes");

    return quotes.reduce((best, cur) => {
      const scoreBest = best.outAmount - best.gasEstimate;
      const scoreCur = cur.outAmount - cur.gasEstimate;
      return scoreCur > scoreBest ? cur : best;
    });
  }
}
