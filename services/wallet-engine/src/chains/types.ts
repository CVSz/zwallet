import type { WalletTransferRecord } from "../walletEngine.js";

export interface ChainBalance {
  chain: WalletTransferRecord["chain"];
  address: string;
  asset: string;
  amountAtomic: string;
  decimals: number;
}

export interface ChainFeeEstimate {
  chain: WalletTransferRecord["chain"];
  feeAtomic: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface ChainBroadcastResult {
  txHash: string;
  simulated: boolean;
}

export interface ChainAdapter {
  chain: WalletTransferRecord["chain"];
  getBalance(address: string): Promise<ChainBalance>;
  estimateFee(transfer: WalletTransferRecord): Promise<ChainFeeEstimate>;
  broadcastTransfer(transfer: WalletTransferRecord): Promise<ChainBroadcastResult>;
}
