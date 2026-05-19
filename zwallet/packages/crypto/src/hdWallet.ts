import { HDNodeWallet, Mnemonic } from "ethers";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { z } from "zod";
import { PathSchema } from "./types.js";

const DeriveSchema = z.object({
  mnemonic: z.string().min(1).refine((m) => validateMnemonic(m), "Invalid BIP39 mnemonic"),
  path: PathSchema,
});

export function createMnemonic(strength: 128 | 256 = 256): string {
  return generateMnemonic(strength);
}

export function deriveBip32Node(mnemonic: string, path: string): HDNodeWallet {
  const input = DeriveSchema.parse({ mnemonic, path });
  const root = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(input.mnemonic));
  return root.derivePath(path.replace(/^m\//, ""));
}

export function deriveSeed(mnemonic: string): Buffer {
  if (!validateMnemonic(mnemonic)) throw new Error("Invalid mnemonic");
  return mnemonicToSeedSync(mnemonic);
}
