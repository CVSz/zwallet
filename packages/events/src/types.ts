export enum Events {
  TX_REQUESTED = 'tx.requested',
  TX_SIGNED = 'tx.signed',
  TX_BROADCASTED = 'tx.broadcasted',
  SWAP_REQUESTED = 'swap.requested',
  SWAP_EXECUTED = 'swap.executed',
  CARD_AUTH_REQUEST = 'card.auth.request',
  CARD_AUTH_RESULT = 'card.auth.result',
}

export type EventEnvelope<TPayload = unknown> = {
  idempotencyKey: string;
  event: Events;
  payload: TPayload;
  timestamp: string;
};
