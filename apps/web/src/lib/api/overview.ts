import { requestJson } from "@/lib/api/client";
import {
  parseWalletAccounts,
  parseWalletOverview,
  parseWalletTransfers,
  type WalletAccount,
  type WalletOverview,
  type WalletTransfer,
} from "@/lib/api/types";

export function getOverview(): Promise<WalletOverview> {
  return requestJson("/api/overview", parseWalletOverview);
}

export function getTransfers(): Promise<WalletTransfer[]> {
  return requestJson("/api/transfers", parseWalletTransfers);
}

export function getAccounts(): Promise<WalletAccount[]> {
  return requestJson("/api/accounts", parseWalletAccounts);
}
