import { createHash } from "node:crypto";
import type { ChainAdapter, ChainBalance, ChainBroadcastResult, ChainFeeEstimate } from "../types.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export class SolanaChainAdapter implements ChainAdapter {
  readonly chain = "solana" as const;

  async getBalance(address: string): Promise<ChainBalance> {
    return {
      chain: this.chain,
      address,
      asset: "SOL",
      amountAtomic: "0",
      decimals: 9
    };
  }

  async estimateFee(_transfer: WalletTransferRecord): Promise<ChainFeeEstimate> {
    return {
      chain: this.chain,
      feeAtomic: "5000"
    };
  }

  async broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult> {
    const txHash = createHash("sha256")
      .update(`solana:${transfer.id}:${transfer.digest}`)
      .digest("hex");

    return {
      txHash,
      simulated: true
    };
  }
}
