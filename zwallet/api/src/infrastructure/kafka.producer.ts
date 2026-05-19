import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'zwallet',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

export async function sendEvent(topic: string, message: object) {
  await producer.connect();

  await producer.send({
    topic,
    messages: [
      { value: JSON.stringify(message) }
    ]
  });
}
