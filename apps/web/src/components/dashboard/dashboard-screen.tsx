"use client";

import { Menu, RefreshCw } from "lucide-react";

import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { TransfersTable } from "@/components/dashboard/transfers-table";
import { WalletConnectPanel } from "@/components/dashboard/wallet-connect-panel";
import { shortAddress } from "@/components/dashboard/transfer-helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { InlineError } from "@/components/ui/inline-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useOverview } from "@/hooks/use-overview";
import { useTransfers } from "@/hooks/use-transfers";
import { useUiStore } from "@/lib/stores/ui-store";

function AccountsPanel() {
  const { data: accounts = [], isLoading, isError, error, refetch } = useAccounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <InlineError
            title="Unable to load accounts"
            detail={error instanceof Error ? error.message : "Unknown error"}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}

        {!isLoading && !isError ? (
          <div className="space-y-2">
            {accounts.slice(0, 8).map((account) => (
              <div
                key={account.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-100">{account.label}</p>
                  <Badge variant={account.status === "active" ? "success" : "danger"}>
                    {account.status}
                  </Badge>
                </div>

                <p className="mt-1 font-mono text-xs uppercase text-slate-300">{account.chain}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">{shortAddress(account.address)}</p>
              </div>
            ))}

            {accounts.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                No wallet accounts available yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardScreen() {
  const { data: overview, isLoading: overviewLoading, isError: overviewError, error: overviewErrorData, refetch: refetchOverview } =
    useOverview();
  const {
    data: transfers = [],
    isLoading: transfersLoading,
    isError: transfersError,
    error: transfersErrorData,
    refetch: refetchTransfers,
  } = useTransfers();

  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4 pb-10 md:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="mt-1 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300/80">Phase 15A</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
                Treasury Operations Overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Real-time wallet operations from `/api/overview`, strict typed state, and live transfer
                activity stream.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              void refetchOverview();
              void refetchTransfers();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </header>

        {overviewError ? (
          <div className="mb-4">
            <InlineError
              title="Unable to load overview"
              detail={overviewErrorData instanceof Error ? overviewErrorData.message : "Unknown error"}
              onRetry={() => {
                void refetchOverview();
              }}
            />
          </div>
        ) : null}

        <OverviewCards overview={overview} isLoading={overviewLoading} />

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <WalletConnectPanel />

            {transfersError ? (
              <InlineError
                title="Unable to load transfers"
                detail={
                  transfersErrorData instanceof Error
                    ? transfersErrorData.message
                    : "Unknown transfer query error"
                }
                onRetry={() => {
                  void refetchTransfers();
                }}
              />
            ) : (
              <TransfersTable transfers={transfers} isLoading={transfersLoading} />
            )}
          </div>

          <div className="space-y-4">
            <AccountsPanel />
            <LiveActivityFeed />
          </div>
        </section>
      </main>
    </div>
  );
}
