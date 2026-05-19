import Fastify from 'fastify';
import { MultiRpcPool, createFetchRpcClient } from '@zwallet/rpc';

const app = Fastify({ logger: true });

interface IndexedBlock {
  blockNumber: number;
  transactions: string[];
  processedAt: string;
}

const history: IndexedBlock[] = [];

app.get('/health', async () => ({ service: 'indexer-service', status: 'ok', backlog: 0 }));

/**
 * Simulates the ingestion of a new block.
 */
async function processBlock(rpc: MultiRpcPool, blockNumber: number) {
  console.log(`[Indexer] Processing block ${blockNumber}...`);
  
  // Simulation: Fetch logs and transactions
  const block = {
    blockNumber,
    transactions: [
      `0x${Math.random().toString(16).slice(2)}`,
      `0x${Math.random().toString(16).slice(2)}`
    ],
    processedAt: new Date().toISOString()
  };
  
  history.unshift(block);
  if (history.length > 100) history.pop();
}

app.get('/v1/indexer/history', async () => {
  return history;
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
