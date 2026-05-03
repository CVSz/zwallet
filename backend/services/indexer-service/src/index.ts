import Fastify from 'fastify';
import {
  type IndexJob,
  type IndexedChain,
  type IndexerEvent,
  type TokenAsset,
  type TokenMetadata,
  IndexedTokenStore,
  MetadataCache,
  TokenDiscoveryService,
  metadataCacheKey,
  renderNft,
} from '../../../packages/shared/src/index.js';

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
  constructor(private readonly publisher: QueuePublisher, private readonly jobs: IdempotentJobStore, private readonly tokenStore: IndexedTokenStore) {}

  async processBatch(batch: IndexJob[]): Promise<void> {
    await Promise.all(batch.map((job) => this.processJob(job)));
  }

  private async processJob(job: IndexJob): Promise<void> {
    if (!this.jobs.tryStart(job.idempotencyKey)) return;
    const now = new Date().toISOString();

    await Promise.all(job.addresses.map(async (address: string) => {
      const mockTokens = this.mockTokens(job.chain, address, now);
      mockTokens.forEach((token) => this.tokenStore.ingest(token));

      const balanceEvent = { type: 'balance.tracked', chain: job.chain, address, balance: this.mockBalance(job.chain), blockRef: job.cursor ?? 'latest', observedAt: now } as const;
      const txEvent = { type: 'transaction.observed', chain: job.chain, txHash: `${job.chain}-${address}-${Date.now()}`, address, confirmations: 0, status: 'pending', observedAt: now } as const;
      await this.publisher.publish('indexer.balance', balanceEvent);
      await this.publisher.publish('indexer.tx', txEvent);
      await this.publisher.publish('indexer.ws', { type: 'websocket.push', chain: job.chain, channel: `wallet.${address}`, payload: balanceEvent, pushedAt: now });
      await this.publisher.publish('indexer.ws', { type: 'websocket.push', chain: job.chain, channel: `wallet.${address}`, payload: txEvent, pushedAt: now });
    }));
  }

  private mockBalance(chain: IndexedChain): string {
    return chain === 'bitcoin' ? '0.015' : chain === 'solana' ? '2.4' : '1.25';
  }

  private mockTokens(chain: IndexedChain, address: string, discoveredAt: string): TokenAsset[] {
    if (chain === 'evm') {
      return [
        { chain, standard: 'erc20', contractAddress: '0xA0b86991', symbol: 'USDC', balance: '105.22', ownerAddress: address, discoveredAt },
        { chain, standard: 'erc721', contractAddress: '0xabc721', tokenId: '421', symbol: 'ZWNFT', balance: '1', ownerAddress: address, metadataUri: 'ipfs://zw/421', discoveredAt },
        { chain, standard: 'erc1155', contractAddress: '0xabc1155', tokenId: '7', symbol: 'GAMEITEM', balance: '3', ownerAddress: address, metadataUri: 'ipfs://zw/7', discoveredAt },
      ];
    }
    if (chain === 'solana') {
      return [
        { chain, standard: 'spl', contractAddress: 'So11111111111111111111111111111111111111112', symbol: 'wSOL', balance: '4.1', ownerAddress: address, discoveredAt },
        { chain, standard: 'spl', contractAddress: 'NFTMint1111111111111111111111111111111111111', tokenId: '1', symbol: 'SOL-NFT', balance: '1', ownerAddress: address, metadataUri: 'https://nft.zwallet/sol/1', discoveredAt },
      ];
    }
    return [
      { chain, standard: 'btc-utxo', symbol: 'BTC', balance: '0.015', ownerAddress: address, discoveredAt },
    ];
  }
}

const app = Fastify({ logger: true });
const indexedTokenStore = new IndexedTokenStore();
const metadataCache = new MetadataCache();
const tokenDiscovery = new TokenDiscoveryService(indexedTokenStore);
const worker = new IndexerWorker(new ConsoleQueuePublisher(), new IdempotentJobStore(), indexedTokenStore);

app.get('/health', async () => ({
  service: 'indexer-service', status: 'ok', queue: process.env.QUEUE_PROVIDER ?? 'nats|kafka', evmProvider: process.env.EVM_PROVIDER ?? 'alchemy|infura|self-node', solanaProvider: process.env.SOLANA_RPC_PROVIDER ?? 'rpc-pool', bitcoinProvider: process.env.BTC_PROVIDER ?? 'node-or-api', timestamp: new Date().toISOString(),
}));

app.post<{ Body: { jobs: IndexJob[] } }>('/indexer/batch', async (req) => {
  await worker.processBatch(req.body.jobs);
  return { accepted: req.body.jobs.length };
});

app.get<{ Querystring: { chain: IndexedChain; address: string; cursor?: string; limit?: string } }>('/tokens/discover', async (req) => {
  const result = tokenDiscovery.discover({
    chain: req.query.chain,
    address: req.query.address,
    cursor: req.query.cursor,
    limit: req.query.limit ? Number(req.query.limit) : 50,
  });

  return {
    items: result.items,
    nextCursor: result.nextCursor,
    lazyLoaded: true,
    indexedQuery: true,
  };
});

app.get<{ Querystring: { chain: IndexedChain; standard: string; symbol: string; contractAddress?: string; tokenId?: string } }>('/tokens/metadata', async (req) => {
  const probe = {
    chain: req.query.chain,
    standard: req.query.standard as TokenAsset['standard'],
    symbol: req.query.symbol,
    contractAddress: req.query.contractAddress,
    tokenId: req.query.tokenId,
  };

  const key = metadataCacheKey(probe);
  const cached = metadataCache.get(key);
  if (cached) return { metadata: cached, cache: 'hit' };

  const now = new Date();
  const metadata: TokenMetadata = {
    ...probe,
    name: `${req.query.symbol} Token`,
    decimals: probe.standard === 'erc721' || probe.standard === 'erc1155' ? undefined : 9,
    imageUrl: probe.tokenId ? `https://images.zwallet.dev/${req.query.symbol}/${probe.tokenId}.png` : undefined,
    animationUrl: probe.tokenId ? `https://images.zwallet.dev/${req.query.symbol}/${probe.tokenId}.mp4` : undefined,
    traits: probe.tokenId ? { rarity: 'rare', level: 3 } : undefined,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000 * 30).toISOString(),
  };

  metadataCache.set(key, metadata);
  return { metadata, cache: 'miss' };
});

app.get<{ Querystring: { chain: IndexedChain; address: string; cursor?: string; limit?: string } }>('/tokens/nfts', async (req) => {
  const result = tokenDiscovery.discover({
    chain: req.query.chain,
    address: req.query.address,
    cursor: req.query.cursor,
    limit: req.query.limit ? Number(req.query.limit) : 25,
  });

  const nfts = result.items
    .map((token: TokenAsset) => {
      const key = metadataCacheKey(token);
      const metadata = metadataCache.get(key);
      return renderNft(token, metadata);
    })
    .filter(Boolean);

  return { items: nfts, nextCursor: result.nextCursor };
});

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
