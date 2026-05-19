"use client";

import { useQuery } from "@tanstack/react-query";

import { getAccounts } from "@/lib/api/overview";
import type { WalletAccount } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useAccounts() {
  return useQuery<WalletAccount[]>({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    refetchInterval: 30_000,
  });
}
