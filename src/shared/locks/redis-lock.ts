/**
 * Redis distributed lock for cron and per-feed processing.
 */

import { getRedisClient } from '@/shared/cache/redis.client';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('redis-lock');

export interface LockOptions {
  ttl?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export class RedisLock {
  private readonly lockKey: string;
  private readonly ttl: number;
  private readonly retryDelay: number;
  private readonly maxRetries: number;
  private lockValue: string | null = null;

  constructor(lockKey: string, options: LockOptions = {}) {
    this.lockKey = `lock:${lockKey}`;
    this.ttl = options.ttl ?? 30000;
    this.retryDelay = options.retryDelay ?? 100;
    this.maxRetries = options.maxRetries ?? 0;
  }

  private generateLockValue(): string {
    return `${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async acquire(): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) {
      log.debug('Redis unavailable, assuming lock acquired', { lockKey: this.lockKey });
      return true;
    }
    this.lockValue = this.generateLockValue();
    try {
      const result = await redis.set(this.lockKey, this.lockValue, { NX: true, PX: this.ttl });
      if (result === 'OK') {
        log.debug('Lock acquired', { lockKey: this.lockKey, ttl: this.ttl });
        return true;
      }
      return false;
    } catch (error) {
      log.error('Error acquiring lock', error, { lockKey: this.lockKey });
      throw error;
    }
  }

  async acquireWithRetry(): Promise<boolean> {
    let attempts = 0;
    while (attempts <= this.maxRetries) {
      const acquired = await this.acquire();
      if (acquired) return true;
      if (attempts < this.maxRetries) await new Promise((r) => setTimeout(r, this.retryDelay));
      attempts++;
    }
    return false;
  }

  async release(): Promise<boolean> {
    if (!this.lockValue) return false;
    const redis = await getRedisClient();
    if (!redis) {
      this.lockValue = null;
      return true;
    }
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = (await redis.eval(script, { keys: [this.lockKey], arguments: [this.lockValue] })) as number;
      if (result === 1) {
        log.debug('Lock released', { lockKey: this.lockKey });
        this.lockValue = null;
        return true;
      }
      log.warn('Lock release failed - value mismatch or released', { lockKey: this.lockKey });
      return false;
    } catch (error) {
      log.error('Error releasing lock', error, { lockKey: this.lockKey });
      throw error;
    }
  }

  async extend(additionalTtl: number): Promise<boolean> {
    if (!this.lockValue) return false;
    const redis = await getRedisClient();
    if (!redis) return false;
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      const result = (await redis.eval(script, { keys: [this.lockKey], arguments: [this.lockValue, String(additionalTtl)] })) as number;
      return result === 1;
    } catch (error) {
      log.error('Error extending lock', error, { lockKey: this.lockKey });
      throw error;
    }
  }

  async isLocked(): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;
    const value = await redis.get(this.lockKey);
    return value !== null;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const acquired = await this.acquireWithRetry();
    if (!acquired) throw new Error(`Failed to acquire lock: ${this.lockKey}`);
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}

export function createCronLock(ttl: number = 1800000): RedisLock {
  return new RedisLock('cron:rss-feeds-scheduler', { ttl, retryDelay: 1000, maxRetries: 0 });
}

export function createFeedLock(feedId: number, ttl: number = 600000): RedisLock {
  return new RedisLock(`feed:${feedId}`, { ttl, retryDelay: 500, maxRetries: 0 });
}
