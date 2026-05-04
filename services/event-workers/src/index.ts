import { randomUUID } from 'node:crypto';
import { createEventBusFromEnv, EventDeduplicator, Events, withRetry, type EventEnvelope } from '@zwallet/events';
import { selectBestRoute, type RouteCandidate, type SwapQuoteRequest } from '@zwallet/swap-engine';

const eventBus = createEventBusFromEnv(process.env);
const deduplicator = new EventDeduplicator();

function fakeRoutes(amount: string): RouteCandidate[] {
  return [
    { routeId: 'dex-primary', provider: 'dex', expectedOutAtomic: amount, gasUnits: 180000n, estimatedLatencyMs: 450, slippageBps: 45, simulationOk: true },
    { routeId: 'rfq-backup', provider: 'rfq', expectedOutAtomic: amount, gasUnits: 170000n, estimatedLatencyMs: 900, slippageBps: 40, simulationOk: true }
  ];
}

async function handleTxRequested(envelope: EventEnvelope): Promise<void> {
  if (!deduplicator.shouldProcess(envelope)) return;
  await withRetry(async () => {
    await eventBus.publish(Events.TX_EXECUTED, {
      eventId: randomUUID(),
      idempotencyKey: envelope.idempotencyKey,
      event: Events.TX_EXECUTED,
      payload: { sourceEventId: envelope.eventId, idempotencyKey: envelope.idempotencyKey, status: 'success', details: { executedAt: new Date().toISOString() } },
      timestamp: new Date().toISOString(),
    });
  });
}

async function handleSwapRequested(envelope: EventEnvelope<{ fromToken: string; toToken: string; amount: string; slippageBps: number }>): Promise<void> {
  if (!deduplicator.shouldProcess(envelope)) return;

  await withRetry(async () => {
    const request: SwapQuoteRequest = {
      chain: 'evm',
      fromToken: envelope.payload.fromToken,
      toToken: envelope.payload.toToken,
      amountInAtomic: envelope.payload.amount,
      maxSlippageBps: envelope.payload.slippageBps,
      gasPriceGwei: '8.0',
    };

    const bestRoute = selectBestRoute(request, fakeRoutes(envelope.payload.amount));

    await eventBus.publish(Events.SWAP_EXECUTED, {
      eventId: randomUUID(),
      idempotencyKey: envelope.idempotencyKey,
      event: Events.SWAP_EXECUTED,
      payload: { sourceEventId: envelope.eventId, idempotencyKey: envelope.idempotencyKey, status: 'success', details: bestRoute },
      timestamp: new Date().toISOString(),
    });
  });
}

await eventBus.connect();
await eventBus.subscribe(Events.TX_REQUESTED, handleTxRequested);
await eventBus.subscribe(Events.SWAP_REQUESTED, handleSwapRequested);
