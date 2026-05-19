import type { WalletTransfer } from "@/lib/api/types";
import { isWalletTransfer } from "@/lib/api/types";
import type { LiveConnectionState } from "@/lib/stores/ui-store";

export type TransferActivityEventType = "transfer.created" | "transfer.updated";

export interface TransferActivityEvent {
  type: TransferActivityEventType;
  transfer: WalletTransfer;
  occurredAt: string;
  source: "websocket";
}

interface WebsocketEnvelope {
  type?: unknown;
  transfer?: unknown;
  data?: unknown;
  occurredAt?: unknown;
}

export interface WebsocketEventServiceOptions {
  url: string;
  onEvent: (event: TransferActivityEvent) => void;
  onStateChange?: (state: LiveConnectionState) => void;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeEventType(value: unknown): TransferActivityEventType | null {
  if (value === "transfer.created" || value === "transfer.updated") {
    return value;
  }

  return null;
}

function parseEnvelope(raw: unknown): WebsocketEnvelope | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    type: raw.type,
    transfer: raw.transfer,
    data: raw.data,
    occurredAt: raw.occurredAt,
  };
}

function parseTransferActivityEvent(raw: unknown): TransferActivityEvent | null {
  const envelope = parseEnvelope(raw);
  if (!envelope) {
    return null;
  }

  const directType = normalizeEventType(envelope.type);
  if (directType && isWalletTransfer(envelope.transfer)) {
    return {
      type: directType,
      transfer: envelope.transfer,
      occurredAt:
        typeof envelope.occurredAt === "string" && Number.isFinite(Date.parse(envelope.occurredAt))
          ? envelope.occurredAt
          : new Date().toISOString(),
      source: "websocket",
    };
  }

  if (!isRecord(envelope.data)) {
    return null;
  }

  const nestedType = normalizeEventType(envelope.data.type);
  if (!nestedType || !isWalletTransfer(envelope.data.transfer)) {
    return null;
  }

  return {
    type: nestedType,
    transfer: envelope.data.transfer,
    occurredAt:
      typeof envelope.data.occurredAt === "string" &&
      Number.isFinite(Date.parse(envelope.data.occurredAt))
        ? envelope.data.occurredAt
        : new Date().toISOString(),
    source: "websocket",
  };
}

export class WebsocketEventService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelayMs = 1_500;
  private closedByUser = false;
  private options: WebsocketEventServiceOptions | null = null;

  connect(options: WebsocketEventServiceOptions): void {
    this.options = options;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1_500;
    this.closedByUser = false;

    this.connectSocket();
  }

  close(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.emitState("disconnected");
  }

  private connectSocket(): void {
    if (typeof window === "undefined" || !this.options) {
      return;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.emitState(this.reconnectTimer ? "reconnecting" : "connecting");

    try {
      const socket = new WebSocket(this.options.url);
      this.socket = socket;

      socket.onopen = () => {
        this.emitState("connected");
        this.reconnectDelayMs = this.options?.reconnectDelayMs ?? 1_500;
      };

      socket.onmessage = (event) => {
        const parsed = this.parseMessage(event.data);
        if (parsed && this.options) {
          this.options.onEvent(parsed);
        }
      };

      socket.onerror = () => {
        this.emitState("reconnecting");
      };

      socket.onclose = () => {
        this.socket = null;

        if (this.closedByUser) {
          this.emitState("disconnected");
          return;
        }

        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private parseMessage(raw: unknown): TransferActivityEvent | null {
    if (typeof raw !== "string") {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseTransferActivityEvent(parsed);
    } catch {
      return null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.options || this.closedByUser) {
      return;
    }

    this.emitState("reconnecting");

    const maxDelay = this.options.maxReconnectDelayMs ?? 15_000;
    const waitMs = Math.min(this.reconnectDelayMs, maxDelay);

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectSocket();
    }, waitMs);

    this.reconnectDelayMs = Math.min(waitMs * 2, maxDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emitState(state: LiveConnectionState): void {
    this.options?.onStateChange?.(state);
  }
}
