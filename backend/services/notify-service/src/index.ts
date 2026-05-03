import Fastify from 'fastify';

const app = Fastify({ logger: true });
app.get('/health', async () => ({ service: 'notify-service', status: 'ok', timestamp: new Date().toISOString() }));

await app.listen({ port: Number(process.env.PORT ?? 0), host: '0.0.0.0' });
