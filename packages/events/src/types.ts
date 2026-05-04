export enum Events {
  TX_REQUESTED = 'tx.requested',
  TX_EXECUTED = 'tx.executed',
  TX_FAILED = 'tx.failed',
  SWAP_REQUESTED = 'swap.requested',
  SWAP_EXECUTED = 'swap.executed',
  SWAP_FAILED = 'swap.failed',
  CARD_AUTH_REQUEST = 'card.auth.request',
  CARD_AUTH_RESULT = 'card.auth.result',
}

export type EventEnvelope<TPayload = unknown> = {
  eventId: string;
  idempotencyKey: string;
  event: Events;
  payload: TPayload;
  timestamp: string;
  attempts?: number;
};

export interface TxRequestedPayload {
  chainId: number;
  from: string;
  to: string;
  value: string;
  nonce: number;
}

export interface SwapRequestedPayload {
  fromToken: string;
  toToken: string;
  amount: string;
  slippageBps: number;
  user: string;
}

export interface WorkerResultPayload {
  sourceEventId: string;
  idempotencyKey: string;
  status: 'success' | 'failed';
  details: Record<string, unknown>;
}
