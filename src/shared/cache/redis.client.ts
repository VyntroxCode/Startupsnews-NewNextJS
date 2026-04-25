import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisDisabled = String(process.env.DISABLE_REDIS || '').toLowerCase() === 'true';

export async function getRedisClient() {
  if (redisDisabled) return null;
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({
    url,
    socket: {
      connectTimeout: 5000, // Fail fast if Redis is not running (e.g. local dev without Redis)
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return redisClient;
  } catch (err) {
    console.error('Redis connect failed, cache disabled:', err);
    redisClient = null;
    redisDisabled = true;
    return null;
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Cache helper functions (no-op when Redis unavailable)
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/** Delete all keys matching a prefix (e.g. "posts:all:") so list caches can be invalidated when posts change. */
export async function deleteCacheByPrefix(prefix: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    let cursor: string = '0';
    do {
      const result = await client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys?.length > 0) await client.del(result.keys);
    } while (cursor !== '0');
  } catch (error) {
    console.error('Redis deleteByPrefix error:', error);
  }
}

/** Call when posts are created/updated so home and list views show new posts. */
export async function invalidatePostsListCache(): Promise<void> {
  await Promise.all([
    deleteCacheByPrefix('posts:all:'),
    deleteCacheByPrefix('posts:category:'),
    deleteCacheByPrefix('posts:related:'),
    deleteCacheByPrefix('posts:prevnext:'),
    deleteCacheByPrefix('search:posts:'),
    deleteCacheByPrefix('api:posts:'),
    deleteCacheByPrefix('api:post:'),
  ]);
}

