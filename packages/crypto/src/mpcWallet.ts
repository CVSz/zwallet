import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const KeyShareSchema = z.object({
  id: z.string().min(1),
  share: z.instanceof(Buffer).refine((b) => b.length >= 32, "share must be at least 32 bytes"),
});

export type KeyShare = z.infer<typeof KeyShareSchema>;

export class MPCWallet {
  private readonly threshold: number;
  private readonly shares = new Map<string, Buffer>();

  constructor(threshold: number) {
    if (!Number.isInteger(threshold) || threshold < 2) {
      throw new Error("Threshold must be an integer >= 2");
    }
    this.threshold = threshold;
  }

  addShare(input: KeyShare): void {
    const parsed = KeyShareSchema.parse(input);
    this.shares.set(parsed.id, parsed.share);
  }

  private combineShares(): Buffer {
    if (this.shares.size < this.threshold) {
      throw new Error("Insufficient shares");
    }

    const selected = Array.from(this.shares.values()).slice(0, this.threshold);
    const first = selected[0];
    if (!first) throw new Error("Insufficient shares");
    const baseLength = first.length;

    return selected.slice(1).reduce((acc, cur) => {
      const out = Buffer.alloc(baseLength);
      for (let i = 0; i < baseLength; i += 1) {
        out[i] = (acc[i] ?? 0) ^ (cur[i % cur.length] ?? 0);
      }
      return out;
    }, Buffer.from(first));
  }

  sign(payload: Buffer): Buffer {
    if (payload.length === 0) {
      throw new Error("Payload cannot be empty");
    }

    const key = this.combineShares();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key.subarray(0, 32), iv);
    const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
  }

  static encryptShare(share: Buffer, kek: Buffer): Buffer {
    if (share.length === 0) throw new Error("share cannot be empty");
    if (kek.length < 32) throw new Error("kek must be at least 32 bytes");

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", kek.subarray(0, 32), iv);
    const enc = Buffer.concat([cipher.update(share), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
  }

  static decryptShare(blob: Buffer, kek: Buffer): Buffer {
    if (blob.length < 28) throw new Error("invalid encrypted share blob");
    if (kek.length < 32) throw new Error("kek must be at least 32 bytes");

    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const data = blob.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", kek.subarray(0, 32), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
}
