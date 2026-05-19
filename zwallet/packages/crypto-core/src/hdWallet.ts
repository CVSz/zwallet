import * as bip39 from "bip39";
import { HDKey } from "ethereum-cryptography/hdkey";
import { keccak256 } from "ethereum-cryptography/keccak";
import { bytesToHex } from "ethereum-cryptography/utils";
import { z } from "zod";

const MnemonicSchema = z.string().trim().min(1);
const DeriveIndexSchema = z.number().int().min(0).max(2 ** 31 - 1);

export class HDWallet {
  private readonly seed: Buffer;

  private constructor(seed: Buffer) {
    this.seed = Buffer.from(seed);
  }

  static async create(): Promise<{ mnemonic: string; wallet: HDWallet }> {
    const mnemonic = bip39.generateMnemonic(256);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    return { mnemonic, wallet: new HDWallet(seed) };
  }

  static async fromMnemonic(rawMnemonic: string): Promise<HDWallet> {
    const mnemonic = MnemonicSchema.parse(rawMnemonic);
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("INVALID_MNEMONIC");
    }
    const seed = await bip39.mnemonicToSeed(mnemonic);
    return new HDWallet(seed);
  }

  deriveEvm(rawIndex = 0): { privateKey: Uint8Array; address: string; path: string } {
    const index = DeriveIndexSchema.parse(rawIndex);
    const path = `m/44'/60'/0'/0/${index}`;
    const hd = HDKey.fromMasterSeed(this.seed);
    const child = hd.derive(path);
    if (!child.privateKey || !child.publicKey) {
      throw new Error("KEY_DERIVATION_FAILED");
    }

    const pubKeyWithoutPrefix = child.publicKey.subarray(1);
    const addressBytes = keccak256(pubKeyWithoutPrefix).subarray(-20);

    return {
      privateKey: child.privateKey,
      address: `0x${bytesToHex(addressBytes)}`,
      path,
    };
  }

  wipe(): void {
    this.seed.fill(0);
  }
}
