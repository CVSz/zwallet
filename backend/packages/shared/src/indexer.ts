export type IndexedChain = 'evm' | 'solana' | 'bitcoin';

export type TokenStandard = 'erc20' | 'erc721' | 'erc1155' | 'spl' | 'btc-utxo';

export interface ChainProviderConfig {
  evmRpcUrls: string[];
  solanaRpcUrls: string[];
  bitcoinRpcUrls: string[];
}

export interface TokenAsset {
  chain: IndexedChain;
  standard: TokenStandard;
  contractAddress?: string;
  tokenId?: string;
  symbol: string;
  balance: string;
  ownerAddress: string;
  metadataUri?: string;
  discoveredAt: string;
}

export interface TokenMetadata {
  chain: IndexedChain;
  standard: TokenStandard;
  contractAddress?: string;
  tokenId?: string;
  symbol: string;
  name: string;
  decimals?: number;
  imageUrl?: string;
  animationUrl?: string;
  traits?: Record<string, string | number | boolean>;
  fetchedAt: string;
  expiresAt: string;
}

export interface NftRenderable {
  chain: IndexedChain;
  standard: Extract<TokenStandard, 'erc721' | 'erc1155' | 'spl'>;
  tokenId: string;
  ownerAddress: string;
  title: string;
  imageUrl?: string;
  animationUrl?: string;
  attributes: Record<string, string | number | boolean>;
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

export interface TokenDiscoveryRequest {
  chain: IndexedChain;
  address: string;
  limit?: number;
  cursor?: string;
}

export class MetadataCache {
  private readonly store = new Map<string, TokenMetadata>();

  get(cacheKey: string, now = Date.now()): TokenMetadata | undefined {
    const metadata = this.store.get(cacheKey);
    if (!metadata) return undefined;
    if (new Date(metadata.expiresAt).getTime() <= now) {
      this.store.delete(cacheKey);
      return undefined;
    }
    return metadata;
  }

  set(cacheKey: string, metadata: TokenMetadata): void {
    this.store.set(cacheKey, metadata);
  }
}

export class IndexedTokenStore {
  private readonly byOwner = new Map<string, TokenAsset[]>();

  ingest(token: TokenAsset): void {
    const key = `${token.chain}:${token.ownerAddress.toLowerCase()}`;
    const current = this.byOwner.get(key) ?? [];
    current.push(token);
    this.byOwner.set(key, current);
  }

  queryByOwner(chain: IndexedChain, ownerAddress: string, cursor = 0, limit = 50): { items: TokenAsset[]; nextCursor?: number } {
    const key = `${chain}:${ownerAddress.toLowerCase()}`;
    const list = this.byOwner.get(key) ?? [];
    const safeCursor = Math.max(0, cursor);
    const boundedLimit = Math.max(1, Math.min(limit, 200));
    const items = list.slice(safeCursor, safeCursor + boundedLimit);
    const nextCursor = safeCursor + boundedLimit < list.length ? safeCursor + boundedLimit : undefined;
    return { items, nextCursor };
  }
}

export class TokenDiscoveryService {
  constructor(private readonly indexedStore: IndexedTokenStore) {}

  discover(request: TokenDiscoveryRequest): { items: TokenAsset[]; nextCursor?: number } {
    const requestedCursor = request.cursor ? Number(request.cursor) : 0;
    const { items, nextCursor } = this.indexedStore.queryByOwner(request.chain, request.address, requestedCursor, request.limit ?? 50);
    return { items, nextCursor };
  }
}

export const metadataCacheKey = (token: Pick<TokenAsset, 'chain' | 'standard' | 'contractAddress' | 'tokenId' | 'symbol'>): string => {
  const contract = token.contractAddress?.toLowerCase() ?? 'native';
  const tokenId = token.tokenId ?? '-';
  return `${token.chain}:${token.standard}:${contract}:${tokenId}:${token.symbol.toLowerCase()}`;
};

export const renderNft = (token: TokenAsset, metadata?: TokenMetadata): NftRenderable | undefined => {
  if (!['erc721', 'erc1155', 'spl'].includes(token.standard)) return undefined;
  if (!token.tokenId) return undefined;

  return {
    chain: token.chain,
    standard: token.standard as NftRenderable['standard'],
    tokenId: token.tokenId,
    ownerAddress: token.ownerAddress,
    title: metadata?.name ?? token.symbol,
    imageUrl: metadata?.imageUrl,
    animationUrl: metadata?.animationUrl,
    attributes: metadata?.traits ?? {},
  };
};
