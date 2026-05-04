import Redis from 'ioredis';
import Redlock from 'redlock';

const client = new Redis();

export const redlock = new Redlock([client], {
  retryCount: 3,
  retryDelay: 200,
});
