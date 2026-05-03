import { createApp } from './app.js';

const app = createApp();
await app.listen({ port: Number(process.env.PORT ?? 8094), host: '0.0.0.0' });
