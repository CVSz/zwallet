import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WalletTransfer } from "@/lib/api/types";

import {
  formatAtomic,
  formatTimestamp,
  shortAddress,
  shortHash,
  transferBadgeVariant,
} from "@/components/dashboard/transfer-helpers";

interface TransfersTableProps {
  transfers: WalletTransfer[];
  isLoading: boolean;
}

export function TransfersTable({ transfers, isLoading }: TransfersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transfers</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Chain</th>
                  <th className="pb-2">From</th>
                  <th className="pb-2">To</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Tx Hash</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {transfers.slice(0, 12).map((transfer) => (
                  <tr key={transfer.id} className="rounded-lg bg-white/[0.03] text-slate-100">
                    <td className="rounded-l-lg px-3 py-2">
                      <Badge variant={transferBadgeVariant(transfer.status)}>{transfer.status}</Badge>
                    </td>
                    <td className="px-3 py-2 uppercase text-slate-300">{transfer.chain}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-200">
                      {shortAddress(transfer.from)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-200">
                      {shortAddress(transfer.to)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-cyan-100">
                      {formatAtomic(transfer.amountAtomic)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-300">
                      {shortHash(transfer.txHash)}
                    </td>
                    <td className="rounded-r-lg px-3 py-2 text-xs text-slate-400">
                      {formatTimestamp(transfer.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
