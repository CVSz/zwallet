export type IndexedChain = 'evm' | 'solana' | 'bitcoin';

export interface ChainMessage {
  chain: IndexedChain;
  payload: unknown;
  idempotencyKey?: string;
  eventId?: string;
}

export interface BalanceDelta {
  chain: Exclude<IndexedChain, 'bitcoin'>;
  address: string;
  asset: string;
  amountDelta: string;
  blockRef: string;
}

export interface UtxoDelta {
  address: string;
  txid: string;
  vout: number;
  satoshis: string;
  spent: boolean;
  blockRef: string;
}

interface EvmLog {
  address: string;
  blockNumber: number;
  transactionHash: string;
  topics: string[];
  data: string;
}

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb';

export function parseEvmTransfer(payload: unknown): BalanceDelta[] {
  const logs = Array.isArray(payload) ? payload as EvmLog[] : [];
  const deltas: BalanceDelta[] = [];
  for (const log of logs) {
    if (!log.topics?.[0]?.startsWith(TRANSFER_TOPIC)) continue;
    const from = `0x${log.topics[1]?.slice(-40)}`.toLowerCase();
    const to = `0x${log.topics[2]?.slice(-40)}`.toLowerCase();
    const amount = BigInt(log.data || '0x0').toString();
    const blockRef = `${log.blockNumber}:${log.transactionHash}`;
    deltas.push({ chain: 'evm', address: from, asset: log.address.toLowerCase(), amountDelta: `-${amount}`, blockRef });
    deltas.push({ chain: 'evm', address: to, asset: log.address.toLowerCase(), amountDelta: amount, blockRef });
  }
  return deltas;
}

export function parseSolanaTransaction(payload: unknown): BalanceDelta[] {
  const tx = payload as {
    slot?: number;
    signature?: string;
    meta?: { preTokenBalances?: Array<{ owner: string; mint: string; uiTokenAmount: { amount: string } }>; postTokenBalances?: Array<{ owner: string; mint: string; uiTokenAmount: { amount: string } }> };
  };
  if (!tx?.meta) return [];

  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const blockRef = `${tx.slot ?? 0}:${tx.signature ?? 'unknown'}`;
  const byKey = new Map<string, bigint>();
  for (const item of pre) byKey.set(`${item.owner}:${item.mint}`, -BigInt(item.uiTokenAmount.amount));
  for (const item of post) {
    const key = `${item.owner}:${item.mint}`;
    byKey.set(key, (byKey.get(key) ?? 0n) + BigInt(item.uiTokenAmount.amount));
  }

  return [...byKey.entries()]
    .filter(([, delta]) => delta !== 0n)
    .map(([key, delta]) => {
      const [address, mint] = key.split(':');
      return { chain: 'solana' as const, address, asset: mint, amountDelta: delta.toString(), blockRef };
    });
}

export function parseBitcoinUtxoEvent(payload: unknown): UtxoDelta[] {
  const events = Array.isArray(payload) ? payload as Array<{ txid: string; vout: number; address: string; satoshis: string; spent?: boolean; blockHeight: number }> : [];
  return events.map((event) => ({
    address: event.address,
    txid: event.txid,
    vout: event.vout,
    satoshis: event.satoshis,
    spent: event.spent ?? false,
    blockRef: `${event.blockHeight}:${event.txid}`,
  }));
}
