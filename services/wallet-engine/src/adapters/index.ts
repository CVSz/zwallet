import type { WalletTransferRecord } from "../walletEngine.js";
import {
  broadcastRealEvmTransfer,
  estimateRealEvmFee,
} from "./evm/realAdapter.js";

export async function estimateTransferFee(transfer: WalletTransferRecord) {
  switch (transfer.chain) {
    case "evm":
      return estimateRealEvmFee(transfer);
    default:
      return { fee: "0", simulated: true };
  }
}

export async function broadcastTransfer(transfer: WalletTransferRecord) {
  switch (transfer.chain) {
    case "evm":
      return broadcastRealEvmTransfer(transfer);
    default:
      throw new Error(`unsupported chain: ${transfer.chain}`);
  }
}
