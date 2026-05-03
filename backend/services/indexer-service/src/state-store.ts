import { type BalanceDelta, type UtxoDelta } from './chains.js';

export interface StateStore {
  tryStartJob(idempotencyKey: string, chain: string): Promise<boolean>;
  markEventProcessed(chain: string, eventId: string): Promise<boolean>;
  applyBalanceDeltas(deltas: BalanceDelta[]): Promise<void>;
  applyUtxoDeltas(deltas: UtxoDelta[]): Promise<void>;
}

export class PostgresStateStore implements StateStore {
  private readonly startedJobs = new Set<string>();
  private readonly processedEvents = new Set<string>();
  private readonly balances = new Map<string, bigint>();
  private readonly utxos = new Map<string, UtxoDelta>();

  async tryStartJob(idempotencyKey: string, chain: string): Promise<boolean> {
    const key = `${chain}:${idempotencyKey}`;
    if (this.startedJobs.has(key)) return false;
    this.startedJobs.add(key);
    return true;
  }

  async markEventProcessed(chain: string, eventId: string): Promise<boolean> {
    const key = `${chain}:${eventId}`;
    if (this.processedEvents.has(key)) return false;
    this.processedEvents.add(key);
    return true;
  }

  async applyBalanceDeltas(deltas: BalanceDelta[]): Promise<void> {
    for (const delta of deltas) {
      const key = `${delta.chain}:${delta.address.toLowerCase()}:${delta.asset.toLowerCase()}`;
      const current = this.balances.get(key) ?? 0n;
      this.balances.set(key, current + BigInt(delta.amountDelta));
    }
  }

  async applyUtxoDeltas(deltas: UtxoDelta[]): Promise<void> {
    for (const delta of deltas) {
      const key = `${delta.txid}:${delta.vout}`;
      this.utxos.set(key, delta);
    }
  }
}
