import { z } from "zod";

const TxInputSchema = z.object({
  to: z.string(),
  value: z.bigint().min(0n),
  chainId: z.number().int().positive(),
  maxFeePerGas: z.bigint().positive(),
});

export interface RpcClient {
  simulate(tx: z.infer<typeof TxInputSchema>): Promise<boolean>;
  estimateGas(tx: z.infer<typeof TxInputSchema>): Promise<bigint>;
  sendRawTransaction(rawTx: string): Promise<unknown>;
}

export class TxPipeline {
  private readonly seenOperationIds = new Set<string>();

  constructor(private readonly rpcPool: RpcClient[]) {
    if (rpcPool.length === 0) {
      throw new Error("RPC_POOL_EMPTY");
    }
  }

  async execute(
    txRaw: unknown,
    signer: (tx: z.infer<typeof TxInputSchema> & { gasLimit: bigint; nonce: number }) => string,
    nonce: number,
    operationId: string,
  ): Promise<unknown> {
    if (this.seenOperationIds.has(operationId)) {
      throw new Error("DUPLICATE_OPERATION");
    }
    this.seenOperationIds.add(operationId);
    try {
      const tx = TxInputSchema.parse(txRaw);

      const simulation = await this.firstSuccessful((rpc) => rpc.simulate(tx));
      if (!simulation) throw new Error("SIMULATION_FAILED");

      const gasLimit = await this.firstSuccessful((rpc) => rpc.estimateGas(tx));
      const rawTx = signer({ ...tx, gasLimit, nonce });
      return await this.firstSuccessful((rpc) => rpc.sendRawTransaction(rawTx));
    } catch (error) {
      this.seenOperationIds.delete(operationId);
      throw error;
    }
  }

  private async firstSuccessful<T>(operation: (rpc: RpcClient) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const rpc of this.rpcPool) {
      try {
        return await operation(rpc);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("ALL_RPC_FAILED");
  }
}
