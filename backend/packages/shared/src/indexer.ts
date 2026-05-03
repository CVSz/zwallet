export type IndexedChain = 'evm' | 'solana' | 'bitcoin';

export interface ChainProviderConfig {
  evmRpcUrls: string[];
  solanaRpcUrls: string[];
  bitcoinRpcUrls: string[];
}

export interface BalanceTrackedEvent {
  type: 'balance.tracked';
  chain: IndexedChain;
  address: string;
  balance: string;
  blockRef: string;
  observedAt: string;
}

export interface TransactionObservedEvent {
  type: 'transaction.observed';
  chain: IndexedChain;
  txHash: string;
  address: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  observedAt: string;
}

export interface WebsocketPushEvent {
  type: 'websocket.push';
  chain: IndexedChain;
  channel: string;
  payload: BalanceTrackedEvent | TransactionObservedEvent;
  pushedAt: string;
}

export type IndexerEvent = BalanceTrackedEvent | TransactionObservedEvent | WebsocketPushEvent;

export interface IndexJob {
  idempotencyKey: string;
  chain: IndexedChain;
  addresses: string[];
  cursor?: string;
  enqueuedAt: string;
}
