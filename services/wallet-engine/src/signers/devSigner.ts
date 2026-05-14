import { createHash } from "node:crypto";
import type { SignedTransfer, SignTransferInput, TransferSigner } from "./types.js";

export class DevSigner implements TransferSigner {
  async signTransfer(input: SignTransferInput): Promise<SignedTransfer> {
    return {
      rawTransaction: createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex"),
    };
  }
}
