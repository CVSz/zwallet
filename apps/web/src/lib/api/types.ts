export const SUPPORTED_CHAINS = ["evm", "solana", "bitcoin"] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const TRANSFER_STATUSES = [
  "previewed",
  "queued",
  "executing",
  "confirmed",
  "signed",
  "broadcasted",
  "failed",
  "cancelled",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const WALLET_EVENT_TYPES = [
  "wallet.created",
  "wallet.transfer.requested",
  "wallet.transfer.signed",
  "wallet.transfer.broadcasted",
] as const;

export type WalletEventType = (typeof WALLET_EVENT_TYPES)[number];

export interface WalletAccount {
  id: string;
  userId: string;
  chain: SupportedChain;
  address: string;
  label: string;
  status: "active" | "frozen";
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

export interface WalletTransfer {
  id: string;
  digest: string;
  chain: SupportedChain;
  from: string;
  to: string;
  amountAtomic: string;
  nonce: number;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
  txHash?: string;
  failureReason?: string;
}

export interface WalletEvent {
  id: string;
  type: WalletEventType;
  chain: SupportedChain;
  occurredAt: string;
  userId: string;
  payload: Record<string, unknown>;
}

export interface WalletOverview {
  accounts: WalletAccount[];
  balances: WalletBalance[];
  transfers: WalletTransfer[];
  events: WalletEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string";
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isSupportedChain(value: unknown): value is SupportedChain {
  return typeof value === "string" && SUPPORTED_CHAINS.includes(value as SupportedChain);
}

function isTransferStatus(value: unknown): value is TransferStatus {
  return typeof value === "string" && TRANSFER_STATUSES.includes(value as TransferStatus);
}

function isWalletEventType(value: unknown): value is WalletEventType {
  return typeof value === "string" && WALLET_EVENT_TYPES.includes(value as WalletEventType);
}

function isWalletAccount(value: unknown): value is WalletAccount {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    hasString(value, "userId") &&
    hasString(value, "address") &&
    hasString(value, "label") &&
    (value.status === "active" || value.status === "frozen") &&
    isSupportedChain(value.chain) &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt)
  );
}

function isWalletBalance(value: unknown): value is WalletBalance {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "accountId") &&
    isSupportedChain(value.chain) &&
    hasString(value, "asset") &&
    hasString(value, "amountAtomic") &&
    typeof value.decimals === "number" &&
    Number.isFinite(value.decimals) &&
    isIsoTimestamp(value.updatedAt)
  );
}

export function isWalletTransfer(value: unknown): value is WalletTransfer {
  if (!isRecord(value)) {
    return false;
  }

  const hasOptionalFields =
    (value.txHash === undefined || typeof value.txHash === "string") &&
    (value.failureReason === undefined || typeof value.failureReason === "string");

  return (
    hasString(value, "id") &&
    hasString(value, "digest") &&
    isSupportedChain(value.chain) &&
    hasString(value, "from") &&
    hasString(value, "to") &&
    hasString(value, "amountAtomic") &&
    typeof value.nonce === "number" &&
    Number.isInteger(value.nonce) &&
    isTransferStatus(value.status) &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt) &&
    hasOptionalFields
  );
}

function isWalletEvent(value: unknown): value is WalletEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    isWalletEventType(value.type) &&
    isSupportedChain(value.chain) &&
    isIsoTimestamp(value.occurredAt) &&
    hasString(value, "userId") &&
    isRecord(value.payload)
  );
}

function isArrayOf<T>(value: unknown, predicate: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every((item) => predicate(item));
}

export function isWalletOverview(value: unknown): value is WalletOverview {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isArrayOf(value.accounts, isWalletAccount) &&
    isArrayOf(value.balances, isWalletBalance) &&
    isArrayOf(value.transfers, isWalletTransfer) &&
    isArrayOf(value.events, isWalletEvent)
  );
}

export function isWalletTransferArray(value: unknown): value is WalletTransfer[] {
  return isArrayOf(value, isWalletTransfer);
}

export function isWalletAccountArray(value: unknown): value is WalletAccount[] {
  return isArrayOf(value, isWalletAccount);
}

export function parseWalletOverview(value: unknown): WalletOverview {
  if (!isWalletOverview(value)) {
    throw new Error("Invalid /api/overview response");
  }

  return value;
}

export function parseWalletTransfers(value: unknown): WalletTransfer[] {
  if (!isWalletTransferArray(value)) {
    throw new Error("Invalid /api/transfers response");
  }

  return value;
}

export function parseWalletAccounts(value: unknown): WalletAccount[] {
  if (!isWalletAccountArray(value)) {
    throw new Error("Invalid /api/accounts response");
  }

  return value;
}
