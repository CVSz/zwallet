import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WalletOverview } from "@/lib/api/types";

interface OverviewCardsProps {
  overview?: WalletOverview;
  isLoading: boolean;
}

function formatFiatLike(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function estimatePortfolio(overview: WalletOverview): number {
  let total = 0;

  for (const balance of overview.balances) {
    const amount = Number(balance.amountAtomic);
    if (!Number.isFinite(amount)) {
      continue;
    }

    total += amount / 10 ** balance.decimals;
  }

  return total;
}

export function OverviewCards({ overview, isLoading }: OverviewCardsProps) {
  if (isLoading || !overview) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-[138px]">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="mt-3 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  const confirmed = overview.transfers.filter((transfer) => transfer.status === "confirmed").length;
  const pending = overview.transfers.length - confirmed;

  const cards = [
    {
      label: "Portfolio Estimate",
      value: formatFiatLike(estimatePortfolio(overview)),
      tone: "text-cyan-200",
    },
    {
      label: "Wallet Accounts",
      value: String(overview.accounts.length),
      tone: "text-slate-100",
    },
    {
      label: "Transfers",
      value: String(overview.transfers.length),
      tone: "text-slate-100",
    },
    {
      label: "Pending / Confirmed",
      value: `${pending} / ${confirmed}`,
      tone: "text-emerald-200",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black tracking-tight ${card.tone}`}>{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
