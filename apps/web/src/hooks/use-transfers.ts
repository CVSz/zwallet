"use client";

import { useQuery } from "@tanstack/react-query";

import { getTransfers } from "@/lib/api/overview";
import type { WalletTransfer } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useTransfers() {
  return useQuery<WalletTransfer[]>({
    queryKey: queryKeys.transfers,
    queryFn: getTransfers,
    refetchInterval: 10_000,
  });
}
