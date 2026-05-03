import { createHash } from 'node:crypto';
import {
  parseEvmTransfer,
  parseSolanaTransaction,
  parseBitcoinUtxoEvent,
  type ChainMessage,
  type BalanceDelta,
  type UtxoDelta,
} from './chains.js';
import { type StateStore } from './state-store.js';

export interface Queue {
  publish(message: unknown): Promise<void>;
  consume(maxBatch?: number): Promise<unknown[]>;
}

export class InMemoryQueue implements Queue {
  private readonly messages: unknown[] = [];
  async publish(message: unknown): Promise<void> { this.messages.push(message); }
  async consume(maxBatch = 100): Promise<unknown[]> { return this.messages.splice(0, maxBatch); }
}

export class IndexerWorker {
  constructor(private readonly queue: Queue, private readonly state: StateStore) {}

  async drainOnce(): Promise<number> {
    const messages = await this.queue.consume(200);
    let processed = 0;
    for (const raw of messages) {
      if (!this.isChainMessage(raw)) continue;
      const idempotencyKey = raw.idempotencyKey ?? this.fingerprint(raw);
      const started = await this.state.tryStartJob(idempotencyKey, raw.chain);
      if (!started) continue;

      const eventId = raw.eventId ?? this.fingerprint(raw.payload);
      const deduped = await this.state.markEventProcessed(raw.chain, eventId);
      if (!deduped) continue;

      const updates = this.toStateUpdates(raw);
      await this.state.applyBalanceDeltas(updates.balances);
      await this.state.applyUtxoDeltas(updates.utxos);
      processed += 1;
    }
    return processed;
  }

  private toStateUpdates(msg: ChainMessage): { balances: BalanceDelta[]; utxos: UtxoDelta[] } {
    if (msg.chain === 'evm') return { balances: parseEvmTransfer(msg.payload), utxos: [] };
    if (msg.chain === 'solana') return { balances: parseSolanaTransaction(msg.payload), utxos: [] };
    return { balances: [], utxos: parseBitcoinUtxoEvent(msg.payload) };
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private isChainMessage(value: unknown): value is ChainMessage {
    if (!value || typeof value !== 'object') return false;
    const chain = (value as { chain?: unknown }).chain;
    return chain === 'evm' || chain === 'solana' || chain === 'bitcoin';
  }
}
