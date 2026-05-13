import { createHash, randomUUID } from 'node:crypto';
import { assertTransferRequest, type SupportedChain, type TransferRequest } from '@zwallet/shared-types/wallet';

export interface TransferPreview { id: string; digest: string; canonical: string }

export interface WalletAccount {
  id: string;
  userId: string;
  chain: SupportedChain;
  address: string;
  label: string;
  status: 'active' | 'frozen';
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  accountId: string;
  chain: SupportedChain;
  asset: string;
  amountAtomic: string;
  decimals: number;
  updatedAt: string;
}

export interface WalletTransferRecord {
  id: string;
  digest: string;
  chain: SupportedChain;
  from: string;
  to: string;
  amountAtomic: string;
  nonce: number;
  status: 'previewed' | 'queued' | 'signed' | 'broadcasted' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface WalletEventRecord {
  id: string;
  type: 'wallet.created' | 'wallet.transfer.requested' | 'wallet.transfer.signed' | 'wallet.transfer.broadcasted';
  chain: SupportedChain;
  occurredAt: string;
  userId: string;
  payload: Record<string, unknown>;
}

export interface WalletOverview {
  accounts: WalletAccount[];
  balances: WalletBalance[];
  transfers: WalletTransferRecord[];
  events: WalletEventRecord[];
}

const accounts = new Map<string, WalletAccount>();
const balances = new Map<string, WalletBalance>();
const transfers = new Map<string, WalletTransferRecord>();
const events = new Map<string, WalletEventRecord>();

function nowIso(): string {
  return new Date().toISOString();
}

function accountKey(chain: SupportedChain, address: string): string {
  return `${chain}:${address.toLowerCase()}`;
}

function balanceKey(accountId: string, asset: string): string {
  return `${accountId}:${asset.toUpperCase()}`;
}

function appendEvent(event: Omit<WalletEventRecord, 'id' | 'occurredAt'>): WalletEventRecord {
  const record: WalletEventRecord = { ...event, id: randomUUID(), occurredAt: nowIso() };
  events.set(record.id, record);
  return record;
}

export function buildTransferDigest(request: unknown): TransferPreview {
  assertTransferRequest(request);
  const payload = request as TransferRequest;
  const canonical = JSON.stringify({
    chain: payload.chain,
    from: payload.from.toLowerCase(),
    to: payload.to.toLowerCase(),
    amountAtomic: String(payload.amountAtomic),
    nonce: Number(payload.nonce ?? 0),
    createdAt: payload.createdAt ?? new Date().toISOString()
  });
  return { id: randomUUID(), digest: createHash('sha256').update(canonical).digest('hex'), canonical };
}

export function createWalletAccount(input: { userId: string; chain: SupportedChain; address: string; label?: string }): WalletAccount {
  if (!input.userId.trim()) throw new Error('userId is required');
  if (!input.address || input.address.length < 10) throw new Error('address must be at least 10 characters');
  const key = accountKey(input.chain, input.address);
  const existing = accounts.get(key);
  if (existing) return existing;
  const timestamp = nowIso();
  const account: WalletAccount = {
    id: randomUUID(),
    userId: input.userId,
    chain: input.chain,
    address: input.address,
    label: input.label ?? `${input.chain.toUpperCase()} wallet`,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  accounts.set(key, account);
  balances.set(balanceKey(account.id, input.chain), {
    accountId: account.id,
    chain: input.chain,
    asset: input.chain,
    amountAtomic: '0',
    decimals: input.chain === 'bitcoin' ? 8 : input.chain === 'solana' ? 9 : 18,
    updatedAt: timestamp
  });
  appendEvent({ type: 'wallet.created', chain: input.chain, userId: input.userId, payload: { accountId: account.id, address: account.address } });
  return account;
}

export function listWalletAccounts(): WalletAccount[] {
  return [...accounts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listWalletBalances(): WalletBalance[] {
  return [...balances.values()].sort((a, b) => a.chain.localeCompare(b.chain));
}

export function previewWalletTransfer(request: unknown): WalletTransferRecord {
  assertTransferRequest(request);
  const payload = request as TransferRequest;
  const preview = buildTransferDigest(payload);
  const timestamp = nowIso();
  const record: WalletTransferRecord = {
    id: preview.id,
    digest: preview.digest,
    chain: payload.chain,
    from: payload.from,
    to: payload.to,
    amountAtomic: payload.amountAtomic,
    nonce: Number(payload.nonce ?? 0),
    status: 'previewed',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  transfers.set(record.id, record);
  appendEvent({ type: 'wallet.transfer.requested', chain: record.chain, userId: 'system', payload: { transferId: record.id, digest: record.digest, from: record.from, to: record.to, amountAtomic: record.amountAtomic } });
  return record;
}

export function queueWalletTransfer(id: string): WalletTransferRecord {
  const record = transfers.get(id);
  if (!record) throw new Error('transfer not found');
  const updated: WalletTransferRecord = { ...record, status: 'queued', updatedAt: nowIso() };
  transfers.set(id, updated);
  return updated;
}

export function listWalletTransfers(): WalletTransferRecord[] {
  return [...transfers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listWalletEvents(): WalletEventRecord[] {
  return [...events.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function getWalletOverview(): WalletOverview {
  return {
    accounts: listWalletAccounts(),
    balances: listWalletBalances(),
    transfers: listWalletTransfers(),
    events: listWalletEvents()
  };
}
