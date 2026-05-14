import { ethers } from "ethers";

export const evmProvider = new ethers.JsonRpcProvider(
  process.env.EVM_RPC_URL ?? "https://ethereum-rpc.publicnode.com"
);
