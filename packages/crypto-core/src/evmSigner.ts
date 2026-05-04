import { createHash } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { z } from "zod";

const HexAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const EvmTxSchema = z.object({
  to: HexAddress,
  value: z.bigint().min(0n),
  gasLimit: z.bigint().positive(),
  maxFeePerGas: z.bigint().positive(),
  nonce: z.number().int().min(0),
  chainId: z.number().int().positive(),
  data: z.string().optional(),
});

export type EvmSignableTx = z.infer<typeof EvmTxSchema>;

export class EVMSigner {
  static sign(txRaw: unknown, privateKey: Uint8Array, expectedChainId?: number): string {
    const tx = EvmTxSchema.parse(txRaw);
    if (expectedChainId !== undefined && tx.chainId !== expectedChainId) {
      throw new Error("CHAIN_ID_MISMATCH");
    }
    const payload = Buffer.from(
      JSON.stringify({
        ...tx,
        value: tx.value.toString(),
        gasLimit: tx.gasLimit.toString(),
        maxFeePerGas: tx.maxFeePerGas.toString(),
      }),
      "utf8",
    );
    const digest = createHash("sha256").update(payload).digest();
    const sig = secp256k1.sign(digest, privateKey);
    return Buffer.from(sig.toCompactRawBytes()).toString("hex");
  }
}
