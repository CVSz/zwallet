import { ed25519 } from "@noble/curves/ed25519";
import { z } from "zod";

const SolSignSchema = z.object({
  privateKey: z.instanceof(Uint8Array).refine((v) => v.length === 32, "Expected 32-byte secret key"),
  message: z.instanceof(Uint8Array).refine((v) => v.length > 0),
});

export function signSolanaMessageDeterministic(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  const parsed = SolSignSchema.parse({ privateKey, message });
  return ed25519.sign(parsed.message, parsed.privateKey);
}

export function getSolanaPublicKey(privateKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(privateKey);
}

export function verifySolanaSignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  return ed25519.verify(signature, message, publicKey);
}
