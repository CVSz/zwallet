import 'dotenv/config';
import Fastify from 'fastify';
import { MultiRpcPool, createFetchRpcClient } from '@zwallet/rpc';

const app = Fastify({ logger: true });

interface IndexedBlock {
  blockNumber: number;
  transactions: string[];
  processedAt: string;
}

const history: IndexedBlock[] = [];
let totalFeesZEA = 0;
let totalVolumeUSD = 0;
let tradeCount = 0;

app.get('/health', async () => ({ service: 'indexer-service', status: 'ok', backlog: 0 }));

/**
 * Simulates the ingestion of a new block.
 */
async function processBlock(rpc: MultiRpcPool, blockNumber: number) {
  console.log(`[Indexer] Processing block ${blockNumber}...`);
  
  // Simulation: Fetch logs and transactions
  const txCount = Math.floor(Math.random() * 5);
  const block = {
    blockNumber,
    transactions: Array.from({ length: txCount }, () => `0x${Math.random().toString(16).slice(2)}`),
    processedAt: new Date().toISOString()
  };
  
  // Simulation: Protocol Revenue Capture
  if (txCount > 0) {
    const volume = Math.random() * 5000;
    const fees = volume * 0.003;
    totalVolumeUSD += volume;
    totalFeesZEA += fees;
    tradeCount += txCount;
  }

  history.unshift(block);
  if (history.length > 100) history.pop();
}

app.get('/v1/indexer/history', async () => {
  return history;
});

app.get('/v1/indexer/analytics', async () => {
  return {
    totalFeesZEA: totalFeesZEA.toFixed(4),
    totalVolumeUSD: totalVolumeUSD.toFixed(2),
    tradeCount,
    avgTradeSize: tradeCount > 0 ? (totalVolumeUSD / tradeCount).toFixed(2) : 0,
    timestamp: new Date().toISOString()
  };
});

// Mock RPC config
const rpcPool = new MultiRpcPool([
  { id: 'primary', chain: 'evm', url: 'http://localhost:8545', priority: 100 }
], createFetchRpcClient);

// Start ingestion loop
setInterval(() => {
  const lastBlock = history[0]?.blockNumber || 18000000;
  processBlock(rpcPool, lastBlock + 1).catch(console.error);
}, 12000);

await app.listen({ port: 3007, host: '0.0.0.0' });
console.log('Indexer Service listening on port 3007');
