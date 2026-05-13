import { createHash } from "node:crypto";
import type { ChainAdapter, ChainBalance, ChainBroadcastResult, ChainFeeEstimate } from "../types.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export class BitcoinChainAdapter implements ChainAdapter {
  readonly chain = "bitcoin" as const;

  async getBalance(address: string): Promise<ChainBalance> {
    return {
      chain: this.chain,
      address,
      asset: "BTC",
      amountAtomic: "0",
      decimals: 8
    };
  }

  async estimateFee(_transfer: WalletTransferRecord): Promise<ChainFeeEstimate> {
    return {
      chain: this.chain,
      feeAtomic: "1000"
    };
  }

  async broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult> {
    const txHash = createHash("sha256")
      .update(`bitcoin:${transfer.id}:${transfer.digest}`)
      .digest("hex");

    return {
      txHash,
      simulated: true
    };
  }
}
