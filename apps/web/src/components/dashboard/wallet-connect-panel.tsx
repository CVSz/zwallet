"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WalletConnectPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operator Wallet</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="max-w-[360px] text-sm text-slate-300">
          Connect an operator wallet to inspect address context and prepare future treasury actions.
        </p>

        <ConnectButton
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          showBalance={false}
        />
      </CardContent>
    </Card>
  );
}
