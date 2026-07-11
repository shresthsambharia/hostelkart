import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient = null;
let isRedisAvailable = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        console.warn('[Redis Error] Reconnect condition met:', err.message);
        return true;
      },
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connecting to server...');
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
      console.log('[Redis] Connection established and client is ready.');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      console.error('[Redis Error] Connection failed:', err.message);
    });

    redisClient.on('end', () => {
      isRedisAvailable = false;
      console.log('[Redis] Connection closed.');
    });
  } catch (err) {
    console.error('[Redis Init Error] Failed to create Redis client:', err.message);
  }
}

if (!redisClient) {
  console.warn('[Redis] No REDIS_URL provided or initialization failed. Falling back to Mock client.');
  redisClient = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    ping: async () => 'PONG',
    status: 'disconnected',
    info: async () => 'redis_version:0.0.0\nused_memory_human:0B',
  };
}

export { redisClient, isRedisAvailable };
