import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type SupportedChain = 'evm' | 'solana' | 'bitcoin';

export interface DerivedAccount {
  chain: SupportedChain;
  index: number;
  path: string;
  address: string;
  publicKeyHex: string;
}

export interface EncryptedKeyMaterial {
  algorithm: 'aes-256-gcm';
  saltHex: string;
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
  rounds: number;
}

export interface SecureKeystoreRecord {
  id: string;
  createdAt: string;
  chain: SupportedChain;
  address: string;
  encryptedPrivateKey: EncryptedKeyMaterial;
  metadata?: Record<string, string>;
}

export interface ReplayProtection {
  chainId?: number;
  recentBlockhash?: string;
  lockTime?: number;
}

export interface TxPayload {
  chain: SupportedChain;
  from: string;
  to: string;
  value: string;
  data?: string;
  fee?: string;
  nonce?: number;
  replayProtection?: ReplayProtection;
}



export interface SimulationResult {
  success: boolean;
  gasEstimate: string;
  warnings: string[];
}

export interface SignedTransaction {
  chain: SupportedChain;
  txHash: string;
  rawTransactionHex: string;
  signatureHex: string;
}

const WORDLIST = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract'];

const wipe = (buf: Uint8Array) => buf.fill(0);

const hex = (data: Uint8Array) => Buffer.from(data).toString('hex');

const fromHex = (value: string) => Buffer.from(value, 'hex');

const deriveKek = (password: string, salt: Uint8Array, rounds = 210_000) =>
  pbkdf2Sync(password, salt, rounds, 32, 'sha512');

export class WalletEngine {
  generateMnemonic(words = 12): string {
    if (![12, 15, 18, 21, 24].includes(words)) {
      throw new Error('BIP39 mnemonic size must be 12/15/18/21/24 words');
    }

    const entropy = randomBytes(words);
    const mnemonic = Array.from({ length: words }, (_, i) => WORDLIST[entropy[i] & 0x07]).join(' ');
    wipe(entropy);
    return mnemonic;
  }

  validateMnemonic(mnemonic: string): boolean {
    const words = mnemonic.trim().split(/\s+/);
    return [12, 15, 18, 21, 24].includes(words.length) && words.every((word) => WORDLIST.includes(word));
  }

  deriveSeed(mnemonic: string, passphrase = ''): Buffer {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }
    return pbkdf2Sync(mnemonic.normalize('NFKD'), `mnemonic${passphrase.normalize('NFKD')}`, 2048, 64, 'sha512');
  }

  deriveAccount(chain: SupportedChain, seed: Buffer, index = 0): DerivedAccount {
    const path = this.pathFor(chain, index);
    const nodeKey = createHmac('sha512', seed).update(path).digest();
    const privateKey = nodeKey.subarray(0, 32);
    const publicKey = createHash('sha256').update(privateKey).digest();
    const address = this.addressFor(chain, publicKey);

    wipe(nodeKey);
    return { chain, index, path, address, publicKeyHex: hex(publicKey) };
  }

  encryptPrivateKey(privateKey: Buffer, password: string): EncryptedKeyMaterial {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const rounds = 210_000;
    const key = deriveKek(password, salt, rounds);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(privateKey), cipher.final()]);
    const authTag = cipher.getAuthTag();

    wipe(key);
    return {
      algorithm: 'aes-256-gcm',
      saltHex: hex(salt),
      ivHex: hex(iv),
      ciphertextHex: hex(ciphertext),
      authTagHex: hex(authTag),
      rounds,
    };
  }

  decryptPrivateKey(encrypted: EncryptedKeyMaterial, password: string): Buffer {
    const key = deriveKek(password, fromHex(encrypted.saltHex), encrypted.rounds);
    const decipher = createDecipheriv(encrypted.algorithm, key, fromHex(encrypted.ivHex));
    decipher.setAuthTag(fromHex(encrypted.authTagHex));

    const plaintext = Buffer.concat([decipher.update(fromHex(encrypted.ciphertextHex)), decipher.final()]);
    wipe(key);
    return plaintext;
  }

  signTransaction(payload: TxPayload, privateKey: Buffer): SignedTransaction {
    const canonical = JSON.stringify(payload);
    const signature = createHmac('sha256', privateKey).update(canonical).digest();
    const raw = Buffer.from(canonical, 'utf8');

    const txHash = createHash('sha256').update(raw).update(signature).digest('hex');
    return {
      chain: payload.chain,
      txHash,
      rawTransactionHex: raw.toString('hex'),
      signatureHex: signature.toString('hex'),
    };
  }



  verifyTransactionSignature(payload: TxPayload, signatureHex: string, privateKey: Buffer): boolean {
    const canonical = JSON.stringify(payload);
    const expected = createHmac('sha256', privateKey).update(canonical).digest();
    return this.constantTimeEqual(expected, Buffer.from(signatureHex, 'hex'));
  }

  simulateTransaction(payload: TxPayload): SimulationResult {
    const warnings: string[] = [];
    const value = Number(payload.value);
    if (!Number.isFinite(value) || value <= 0) warnings.push('Invalid transfer value');
    if (!this.verifyReplayProtection(payload)) warnings.push('Replay protection fields missing');
    if (payload.to.toLowerCase() === payload.from.toLowerCase()) warnings.push('Self-transfer detected');

    return {
      success: warnings.length === 0,
      gasEstimate: this.estimateGas(payload),
      warnings,
    };
  }

  estimateGas(payload: TxPayload): string {
    if (payload.chain === 'evm') {
      const dataUnits = payload.data ? payload.data.length / 2 : 0;
      return String(21_000 + Math.ceil(dataUnits * 16));
    }
    if (payload.chain === 'solana') return '5000';
    return '250';
  }

  nextNonce(currentOnChainNonce: number, pendingCount: number): number {
    return currentOnChainNonce + pendingCount;
  }

  verifyReplayProtection(payload: TxPayload): boolean {
    if (payload.chain === 'evm') return typeof payload.replayProtection?.chainId === 'number';
    if (payload.chain === 'solana') return Boolean(payload.replayProtection?.recentBlockhash);
    return typeof payload.replayProtection?.lockTime === 'number';
  }

  constantTimeEqual(a: Buffer, b: Buffer): boolean {
    return a.length === b.length && timingSafeEqual(a, b);
  }

  withUnlockedKey<T>(encrypted: EncryptedKeyMaterial, password: string, fn: (privateKey: Buffer) => T): T {
    const privateKey = this.decryptPrivateKey(encrypted, password);
    try {
      return fn(privateKey);
    } finally {
      wipe(privateKey);
    }
  }

  private pathFor(chain: SupportedChain, index: number): string {
    switch (chain) {
      case 'evm':
        return `m/44'/60'/0'/0/${index}`;
      case 'solana':
        return `m/44'/501'/0'/0'/${index}'`;
      case 'bitcoin':
        return `m/44'/0'/0'/0/${index}`;
    }
  }

  private addressFor(chain: SupportedChain, publicKey: Buffer): string {
    if (chain === 'evm') return `0x${createHash('sha256').update(publicKey).digest('hex').slice(-40)}`;
    if (chain === 'solana') return createHash('sha256').update(publicKey).digest('base64url');
    return createHash('ripemd160').update(publicKey).digest('hex');
  }
}

export class SecureKeystore {
  private readonly records = new Map<string, SecureKeystoreRecord>();

  put(record: SecureKeystoreRecord): void {
    this.records.set(record.id, record);
  }

  get(id: string): SecureKeystoreRecord | undefined {
    return this.records.get(id);
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }
}

export interface BiometricUnlockAdapter {
  isAvailable(): Promise<boolean>;
  authorize(reason: string): Promise<boolean>;
}
