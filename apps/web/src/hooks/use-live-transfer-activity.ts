"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTransfers } from "@/hooks/use-transfers";
import type { WalletOverview, WalletTransfer } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  type TransferActivityEvent,
  WebsocketEventService,
} from "@/lib/websocket/event-service";

export interface LiveTransferActivityItem {
  id: string;
  type: "transfer.created" | "transfer.updated";
  occurredAt: string;
  source: "websocket" | "poll";
  transfer: WalletTransfer;
}

function resolveActivityWsUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_ACTIVITY_WS_URL;
  if (configuredUrl && configuredUrl.trim().length > 0) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/activity`;
}

function getTransferSignature(transfer: WalletTransfer): string {
  return `${transfer.status}:${transfer.updatedAt}:${transfer.txHash ?? ""}`;
}

function upsertTransfer(list: WalletTransfer[], transfer: WalletTransfer): WalletTransfer[] {
  const existingIndex = list.findIndex((item) => item.id === transfer.id);

  if (existingIndex === -1) {
    return [transfer, ...list];
  }

  const next = [...list];
  next[existingIndex] = transfer;
  return next;
}

function toActivityItem(
  event: TransferActivityEvent | { transfer: WalletTransfer; type: "transfer.created" | "transfer.updated"; occurredAt: string; source: "poll" }
): LiveTransferActivityItem {
  return {
    id: `${event.transfer.id}:${event.occurredAt}:${event.type}`,
    type: event.type,
    occurredAt: event.occurredAt,
    source: event.source,
    transfer: event.transfer,
  };
}

export function useLiveTransferActivity(maxItems = 25) {
  const queryClient = useQueryClient();
  const { data: transfers = [] } = useTransfers();
  const [items, setItems] = useState<LiveTransferActivityItem[]>([]);
  const signatureByTransferIdRef = useRef<Map<string, string>>(new Map());
  const serviceRef = useRef<WebsocketEventService | null>(null);

  const isActivityPaused = useUiStore((state) => state.isActivityPaused);
  const setLiveConnection = useUiStore((state) => state.setLiveConnection);

  const addItem = useCallback(
    (item: LiveTransferActivityItem) => {
      if (isActivityPaused) {
        return;
      }

      setItems((current) => {
        const exists = current.some((existing) => existing.id === item.id);
        if (exists) {
          return current;
        }

        return [item, ...current].slice(0, maxItems);
      });
    },
    [isActivityPaused, maxItems]
  );

  useEffect(() => {
    const wsUrl = resolveActivityWsUrl();
    if (!wsUrl) {
      setLiveConnection("disconnected");
      return;
    }

    const service = new WebsocketEventService();
    serviceRef.current = service;

    service.connect({
      url: wsUrl,
      onStateChange: setLiveConnection,
      onEvent: (event) => {
        queryClient.setQueryData<WalletTransfer[]>(queryKeys.transfers, (current = []) => {
          return upsertTransfer(current, event.transfer);
        });

        queryClient.setQueryData<WalletOverview | undefined>(queryKeys.overview, (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            transfers: upsertTransfer(current.transfers, event.transfer),
          };
        });

        addItem(toActivityItem(event));
      },
    });

    return () => {
      service.close();
      serviceRef.current = null;
    };
  }, [addItem, queryClient, setLiveConnection]);

  useEffect(() => {
    for (const transfer of transfers) {
      const nextSignature = getTransferSignature(transfer);
      const previousSignature = signatureByTransferIdRef.current.get(transfer.id);

      if (!previousSignature) {
        signatureByTransferIdRef.current.set(transfer.id, nextSignature);
        addItem(
          toActivityItem({
            type: "transfer.created",
            transfer,
            occurredAt: transfer.createdAt,
            source: "poll",
          })
        );
        continue;
      }

      if (previousSignature !== nextSignature) {
        signatureByTransferIdRef.current.set(transfer.id, nextSignature);
        addItem(
          toActivityItem({
            type: "transfer.updated",
            transfer,
            occurredAt: transfer.updatedAt,
            source: "poll",
          })
        );
      }
    }
  }, [addItem, transfers]);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return {
    activity: items,
    clear,
  };
}
