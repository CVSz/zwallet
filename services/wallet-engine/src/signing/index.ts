import { createHash } from "node:crypto";
import type { WalletTransferRecord } from "../walletEngine.js";

export interface SigningResult {
  signature: string;
  signerMode: "simulated";
}

export async function signTransferSimulation(
  transfer: WalletTransferRecord
): Promise<SigningResult> {
  return {
    signature: createHash("sha256")
      .update(`signature:${transfer.id}:${transfer.digest}`)
      .digest("hex"),
    signerMode: "simulated"
  };
}
