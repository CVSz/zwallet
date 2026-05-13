import type { WalletTransferRecord } from "../walletEngine.js";
import type { ChainAdapter } from "./types.js";
import { EvmChainAdapter } from "./evm/index.js";
import { SolanaChainAdapter } from "./solana/index.js";
import { BitcoinChainAdapter } from "./bitcoin/index.js";

const adapters: Record<WalletTransferRecord["chain"], ChainAdapter> = {
  evm: new EvmChainAdapter(),
  solana: new SolanaChainAdapter(),
  bitcoin: new BitcoinChainAdapter()
};

export function getChainAdapter(chain: WalletTransferRecord["chain"]): ChainAdapter {
  return adapters[chain];
}

export * from "./types.js";
export * from "./evm/index.js";
export * from "./solana/index.js";
export * from "./bitcoin/index.js";
