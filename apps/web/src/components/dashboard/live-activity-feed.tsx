"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import {
  formatTimestamp,
  shortAddress,
  transferBadgeVariant,
} from "@/components/dashboard/transfer-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveTransferActivity } from "@/hooks/use-live-transfer-activity";
import { useUiStore } from "@/lib/stores/ui-store";

export function LiveActivityFeed() {
  const { activity, clear } = useLiveTransferActivity();
  const liveConnection = useUiStore((state) => state.liveConnection);
  const isPaused = useUiStore((state) => state.isActivityPaused);
  const setPaused = useUiStore((state) => state.setActivityPaused);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Live Transfer Activity</CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            Stream: <span className="uppercase text-slate-200">{liveConnection}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setPaused(!isPaused)}
            aria-label={isPaused ? "Resume activity" : "Pause activity"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear activity">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
          {activity.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Waiting for transfer events. Activity will populate from websocket updates or periodic sync.
            </p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Badge variant={transferBadgeVariant(item.transfer.status)}>{item.transfer.status}</Badge>
                  <span className="text-xs uppercase tracking-wide text-slate-400">{item.source}</span>
                </div>
                <p className="text-sm font-semibold text-slate-100">{item.type.replace(".", " ")}</p>
                <p className="mt-1 font-mono text-xs text-slate-300">
                  {shortAddress(item.transfer.from)} → {shortAddress(item.transfer.to)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatTimestamp(item.occurredAt)}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
