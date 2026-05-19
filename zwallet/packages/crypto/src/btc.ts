import { createHash } from "node:crypto";
import { z } from "zod";

type Utxo = { txid: string; vout: number; valueSats: number; scriptPubKey: string };
type Output = { addressScript: string; valueSats: number };

const UtxoSchema = z.object({ txid: z.string().length(64), vout: z.number().int().nonnegative(), valueSats: z.number().int().positive(), scriptPubKey: z.string().min(2) });
const OutputSchema = z.object({ addressScript: z.string().min(2), valueSats: z.number().int().positive() });

export function buildUnsignedBtcTx(utxos: Utxo[], outputs: Output[], locktime = 0): string {
  const ins = z.array(UtxoSchema).nonempty().parse(utxos);
  const outs = z.array(OutputSchema).nonempty().parse(outputs);
  const version = Buffer.from("02000000", "hex");
  const inCount = Buffer.from([ins.length]);
  const vin = Buffer.concat(ins.map((u) => Buffer.concat([Buffer.from(u.txid, "hex").reverse(), u32(u.vout), Buffer.from([0x00]), Buffer.from("ffffffff", "hex")])));
  const outCount = Buffer.from([outs.length]);
  const vout = Buffer.concat(outs.map((o) => Buffer.concat([u64(o.valueSats), varSlice(Buffer.from(o.addressScript, "hex"))])));
  return Buffer.concat([version, inCount, vin, outCount, vout, u32(locktime)]).toString("hex");
}

export function txidFromRaw(rawHex: string): string {
  const bytes = Buffer.from(rawHex, "hex");
  const hash1 = createHash("sha256").update(bytes).digest();
  return createHash("sha256").update(hash1).digest().reverse().toString("hex");
}

const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = (n: number) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const varSlice = (b: Buffer) => Buffer.concat([Buffer.from([b.length]), b]);
