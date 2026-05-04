import { Kafka } from 'kafkajs';
import type { EventEnvelope } from './types.js';

export type EventHandler<T = unknown> = (message: T) => Promise<void>;

export interface EventBus {
  connect(): Promise<void>;
  publish<T>(topic: string, message: T): Promise<void>;
  subscribe<T>(topic: string, handler: EventHandler<T>): Promise<void>;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  async connect(): Promise<void> {}

  async publish<T>(topic: string, message: T): Promise<void> {
    const handlers = this.handlers.get(topic) ?? [];
    await Promise.all(handlers.map((handler) => handler(message)));
  }

  async subscribe<T>(topic: string, handler: EventHandler<T>): Promise<void> {
    const handlers = this.handlers.get(topic) ?? [];
    handlers.push(handler as EventHandler);
    this.handlers.set(topic, handlers);
  }
}

export class KafkaEventBus implements EventBus {
  private readonly kafka: Kafka;
  private readonly producer;
  private readonly consumer;

  constructor(brokers: string[], clientId = 'zwallet', groupId = 'zwallet-group') {
    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async publish<T>(topic: string, message: T): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  async subscribe<T>(topic: string, handler: EventHandler<T>): Promise<void> {
    await this.consumer.subscribe({ topic });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const parsed = JSON.parse(message.value.toString()) as T;
        await handler(parsed);
      },
    });
  }
}

export async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
  throw lastError;
}

export class EventDeduplicator {
  private readonly seenKeys = new Set<string>();

  shouldProcess(envelope: EventEnvelope): boolean {
    if (this.seenKeys.has(envelope.idempotencyKey)) {
      return false;
    }
    this.seenKeys.add(envelope.idempotencyKey);
    return true;
  }
}

export function createEventBusFromEnv(env: NodeJS.ProcessEnv): EventBus {
  const brokers = env.KAFKA_BROKERS?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
  if (brokers.length === 0) {
    return new InMemoryEventBus();
  }
  return new KafkaEventBus(brokers, env.KAFKA_CLIENT_ID ?? 'zwallet', env.KAFKA_GROUP_ID ?? 'zwallet-group');
}
