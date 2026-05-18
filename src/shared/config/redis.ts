import { createClient } from 'redis';

export async function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({ url: redisUrl });

  client.on('error', (err) => console.error('Redis error:', err));
  client.on('connect', () => console.log('✓ Redis connected'));

  await client.connect();
  return client;
}
