import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { z } from "zod";

const InputSchema = z.object({
  plaintext: z.instanceof(Uint8Array).refine((v) => v.length > 0),
  password: z.string().min(12),
});

export function encryptAes256Gcm(plaintext: Uint8Array, password: string): Buffer {
  const { plaintext: pt, password: pw } = InputSchema.parse({ plaintext, password });
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ciphertext]);
}

export function decryptAes256Gcm(payload: Uint8Array, password: string): Buffer {
  const blob = Buffer.from(payload);
  if (blob.length < 44) throw new Error("Invalid encrypted payload");
  const salt = blob.subarray(0, 16);
  const iv = blob.subarray(16, 28);
  const tag = blob.subarray(28, 44);
  const ciphertext = blob.subarray(44);
  const key = scryptSync(password, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
