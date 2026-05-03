import Fastify from 'fastify';

type SupportedChain = 'evm' | 'solana' | 'bitcoin';

interface BalanceTrackedEvent {
  type: 'balance.tracked';
  chain: SupportedChain;
  address: string;
  balance: string;
  blockRef: string;
  observedAt: string;
}

interface TransactionObservedEvent {
  type: 'transaction.observed';
  chain: SupportedChain;
  txHash: string;
  address: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  observedAt: string;
}

interface WebsocketPushEvent {
  type: 'websocket.push';
  chain: SupportedChain;
  channel: string;
  payload: BalanceTrackedEvent | TransactionObservedEvent;
  pushedAt: string;
}

type IndexerEvent = BalanceTrackedEvent | TransactionObservedEvent | WebsocketPushEvent;

interface IndexJob {
  idempotencyKey: string;
  chain: SupportedChain;
  addresses: string[];
  cursor?: string;
  enqueuedAt: string;
}

interface QueuePublisher {
  publish: (subject: string, payload: IndexerEvent) => Promise<void>;
}

class ConsoleQueuePublisher implements QueuePublisher {
  async publish(subject: string, payload: IndexerEvent): Promise<void> {
    console.log(JSON.stringify({ subject, payload }));
  }
}

class IdempotentJobStore {
  private readonly seenKeys = new Set<string>();
  tryStart(key: string): boolean {
    if (this.seenKeys.has(key)) return false;
    this.seenKeys.add(key);
    return true;
  }
}

class IndexerWorker {
  constructor(private readonly publisher: QueuePublisher, private readonly jobs: IdempotentJobStore) {}
  async processBatch(batch: IndexJob[]): Promise<void> {
    await Promise.all(batch.map((job) => this.processJob(job)));
  }
  private async processJob(job: IndexJob): Promise<void> {
    if (!this.jobs.tryStart(job.idempotencyKey)) return;
    const now = new Date().toISOString();
    await Promise.all(job.addresses.map(async (address: string) => {
      const balanceEvent: BalanceTrackedEvent = { type: 'balance.tracked', chain: job.chain, address, balance: this.mockBalance(job.chain), blockRef: job.cursor ?? 'latest', observedAt: now };
      const txEvent: TransactionObservedEvent = { type: 'transaction.observed', chain: job.chain, txHash: `${job.chain}-${address}-${Date.now()}`, address, confirmations: 0, status: 'pending', observedAt: now };
      await this.publisher.publish('indexer.balance', balanceEvent);
      await this.publisher.publish('indexer.tx', txEvent);
      await this.publisher.publish('indexer.ws', { type: 'websocket.push', chain: job.chain, channel: `wallet.${address}`, payload: balanceEvent, pushedAt: now });
      await this.publisher.publish('indexer.ws', { type: 'websocket.push', chain: job.chain, channel: `wallet.${address}`, payload: txEvent, pushedAt: now });
    }));
  }
  private mockBalance(chain: SupportedChain): string { return chain === 'bitcoin' ? '0.015' : chain === 'solana' ? '2.4' : '1.25'; }
}

const app = Fastify({ logger: true });
const worker = new IndexerWorker(new ConsoleQueuePublisher(), new IdempotentJobStore());

app.get('/health', async () => ({
  service: 'indexer-service', status: 'ok', queue: process.env.QUEUE_PROVIDER ?? 'nats|kafka', evmProvider: process.env.EVM_PROVIDER ?? 'alchemy|infura|self-node', solanaProvider: process.env.SOLANA_RPC_PROVIDER ?? 'rpc-pool', bitcoinProvider: process.env.BTC_PROVIDER ?? 'node-or-api', timestamp: new Date().toISOString()
}));

app.post<{ Body: { jobs: IndexJob[] } }>('/indexer/batch', async (req) => {
  await worker.processBatch(req.body.jobs);
  return { accepted: req.body.jobs.length };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
