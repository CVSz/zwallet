import { z } from "zod";
import { signEvmMessageDeterministic } from "./evm.js";
import { signSolanaMessageDeterministic } from "./solana.js";

const RequestSchema = z.discriminatedUnion("chain", [
  z.object({ chain: z.literal("evm"), privateKey: z.string(), payload: z.string(), chainId: z.number().int().positive(), nonce: z.number().int().nonnegative() }),
  z.object({ chain: z.literal("solana"), privateKey: z.instanceof(Uint8Array), payload: z.instanceof(Uint8Array) }),
]);

export async function signByChain(input: z.infer<typeof RequestSchema>): Promise<string | Uint8Array> {
  const req = RequestSchema.parse(input);
  if (req.chain === "evm") return signEvmMessageDeterministic(req);
  return signSolanaMessageDeterministic(req.privateKey, req.payload);
}
