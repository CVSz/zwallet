export type Chain = 'evm' | 'solana' | 'btc';

export interface IndexedBlock {
  chainId: string;
  height: number;
  hash: string;
}

export interface EvmTransferLog {
  chainId: string;
  blockNumber: number;
  blockHash: string;
  txHash: string;
  logIndex: number;
  from: string;
  to: string;
  tokenAddress: string;
  value: string;
}

export interface SolanaWsEvent {
  chainId: string;
  slot: number;
  signature: string;
  instructionIndex: number;
  account: string;
  amount: string;
}

export interface BtcUtxoEvent {
  chainId: string;
  blockHeight: number;
  blockHash: string;
  txid: string;
  vout: number;
  address: string;
  satoshis: number;
}

export type IndexEvent =
  | { chain: 'evm'; payload: EvmTransferLog }
  | { chain: 'solana'; payload: SolanaWsEvent }
  | { chain: 'btc'; payload: BtcUtxoEvent };

export interface ProcessedEvent {
  dedupeKey: string;
  chain: Chain;
  cursor: string;
}

/**
 * In-memory idempotency + dedupe guard for indexer pipelines.
 * Reorg-safe by including block hash in chain-specific keys/cursors.
 */
export class IndexerDeduper {
  private readonly seenKeys = new Set<string>();

  public process(event: IndexEvent): ProcessedEvent | null {
    const dedupeKey = this.buildDedupeKey(event);
    if (this.seenKeys.has(dedupeKey)) {
      return null;
    }

    this.seenKeys.add(dedupeKey);
    return {
      dedupeKey,
      chain: event.chain,
      cursor: this.buildCursor(event),
    };
  }

  public hasSeen(dedupeKey: string): boolean {
    return this.seenKeys.has(dedupeKey);
  }

  private buildCursor(event: IndexEvent): string {
    if (event.chain === 'evm') {
      const p = event.payload;
      return `${p.chainId}:${p.blockNumber}:${p.blockHash}`;
    }

    if (event.chain === 'solana') {
      const p = event.payload;
      return `${p.chainId}:${p.slot}:${p.signature}`;
    }

    const p = event.payload;
    return `${p.chainId}:${p.blockHeight}:${p.blockHash}`;
  }

  private buildDedupeKey(event: IndexEvent): string {
    if (event.chain === 'evm') {
      const p = event.payload;
      return `evm:${p.chainId}:${p.blockHash}:${p.txHash}:${p.logIndex}`;
    }

    if (event.chain === 'solana') {
      const p = event.payload;
      return `solana:${p.chainId}:${p.slot}:${p.signature}:${p.instructionIndex}`;
    }

    const p = event.payload;
    return `btc:${p.chainId}:${p.blockHash}:${p.txid}:${p.vout}`;
  }
}
