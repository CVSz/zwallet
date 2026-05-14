import { randomBytes } from "node:crypto";
import { evmProvider } from "./rpc.js";
import type { WalletTransferRecord } from "../../walletEngine.js";

export async function estimateRealEvmFee(transfer: WalletTransferRecord) {
  const [feeData, blockNumber] = await Promise.all([
    evmProvider.getFeeData(),
    evmProvider.getBlockNumber(),
  ]);

  return {
    chain: transfer.chain,
    gasPrice: feeData.gasPrice?.toString() ?? "0",
    maxFeePerGas: feeData.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() ?? null,
    observedBlock: blockNumber,
  };
}

export async function broadcastRealEvmTransfer(transfer: WalletTransferRecord) {
  const fee = await estimateRealEvmFee(transfer);

  return {
    txHash: "0x" + randomBytes(32).toString("hex"),
    network: "ethereum",
    simulated: true,
    observedBlock: fee.observedBlock,
  };
}
