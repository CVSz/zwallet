import {
  createMnemonic,
  deriveBip32Node,
  signEvmMessageDeterministic,
  signSolanaMessageDeterministic,
  buildUnsignedBtcTx,
  encryptAes256Gcm,
  decryptAes256Gcm,
  wipeBuffer,
} from "../src/index.js";

const mnemonic = createMnemonic(128);
const evmNode = deriveBip32Node(mnemonic, "m/44'/60'/0'/0/0");
console.log("EVM address", evmNode.address);

const sig = await signEvmMessageDeterministic({ privateKey: evmNode.privateKey, payload: "pay:100", chainId: 1, nonce: 1 });
console.log("EVM sig", sig);

const solSk = new Uint8Array(32).fill(7);
const solSig = signSolanaMessageDeterministic(solSk, new TextEncoder().encode("solana-pay"));
console.log("SOL sig", Buffer.from(solSig).toString("hex"));

const raw = buildUnsignedBtcTx(
  [{ txid: "11".repeat(32), vout: 0, valueSats: 12000, scriptPubKey: "76a914" + "22".repeat(20) + "88ac" }],
  [{ addressScript: "76a914" + "33".repeat(20) + "88ac", valueSats: 11000 }],
);
console.log("BTC tx", raw);

const secret = Buffer.from("wallet-seed-backup");
const encrypted = encryptAes256Gcm(secret, "example-password-123");
const decrypted = decryptAes256Gcm(encrypted, "example-password-123");
console.log("Decrypted", decrypted.toString());
wipeBuffer(secret);
