import { strict as assert } from "node:assert";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  createMnemonic,
  deriveBip32Node,
  encryptAes256Gcm,
  decryptAes256Gcm,
  signEvmMessageDeterministic,
  signSolanaMessageDeterministic,
  verifySolanaSignature,
  getSolanaPublicKey,
  buildUnsignedBtcTx,
  wipeBuffer,
} from "../src/index.js";

test("BIP39/44 derive works", () => {
  const mnemonic = createMnemonic(128);
  const node = deriveBip32Node(mnemonic, "m/44'/60'/0'/0/0");
  assert.ok(node.address.startsWith("0x"));
});

test("AES-256-GCM roundtrip", () => {
  const msg = Buffer.from("secret");
  const enc = encryptAes256Gcm(msg, "my-very-strong-password");
  const dec = decryptAes256Gcm(enc, "my-very-strong-password");
  assert.equal(dec.toString(), "secret");
});

test("EVM deterministic signing", async () => {
  const pk = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const a = await signEvmMessageDeterministic({ privateKey: pk, payload: "hello", chainId: 1, nonce: 7 });
  const b = await signEvmMessageDeterministic({ privateKey: pk, payload: "hello", chainId: 1, nonce: 7 });
  assert.equal(a, b);
});

test("Solana sign/verify", () => {
  const sk = randomBytes(32);
  const msg = Buffer.from("solana-msg");
  const sig = signSolanaMessageDeterministic(sk, msg);
  const pub = getSolanaPublicKey(sk);
  assert.equal(verifySolanaSignature(msg, sig, pub), true);
});

test("BTC tx builder", () => {
  const raw = buildUnsignedBtcTx(
    [{ txid: "11".repeat(32), vout: 0, valueSats: 10_000, scriptPubKey: "76a914" + "22".repeat(20) + "88ac" }],
    [{ addressScript: "76a914" + "33".repeat(20) + "88ac", valueSats: 9000 }],
  );
  assert.ok(raw.length > 20);
});

test("memory wipe", () => {
  const buf = Buffer.from("sensitive");
  wipeBuffer(buf);
  assert.equal(buf.every((v) => v === 0), true);
});
