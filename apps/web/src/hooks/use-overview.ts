"use client";

import { useQuery } from "@tanstack/react-query";

import { getOverview } from "@/lib/api/overview";
import type { WalletOverview } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useOverview() {
  return useQuery<WalletOverview>({
    queryKey: queryKeys.overview,
    queryFn: getOverview,
    refetchInterval: 12_000,
  });
}
