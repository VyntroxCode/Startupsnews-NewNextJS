/**
 * Memory guard – optional monitoring for long-running cron.
 */

import { logger } from './logger';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
}

export class MemoryGuard {
  private readonly maxHeapMB: number;
  private readonly warningThresholdMB: number;

  constructor() {
    this.maxHeapMB = parseInt(process.env.MAX_HEAP_MB || '512', 10);
    this.warningThresholdMB = parseInt(process.env.HEAP_WARNING_MB || '384', 10);
  }

  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),
    };
  }

  isSafe(): boolean {
    return this.getMemoryStats().heapUsedMB < this.maxHeapMB;
  }

  check(): void {
    const stats = this.getMemoryStats();
    if (stats.heapUsedMB >= this.maxHeapMB) {
      logger.error('Memory limit exceeded', { heapUsedMB: stats.heapUsedMB, maxHeapMB: this.maxHeapMB });
    } else if (stats.heapUsedMB >= this.warningThresholdMB) {
      logger.warn('Memory usage high', { heapUsedMB: stats.heapUsedMB, warningThresholdMB: this.warningThresholdMB });
    }
  }

  async execute<T>(fn: () => Promise<T>, operation: string): Promise<T> {
    const before = this.getMemoryStats();
    this.check();
    try {
      const result = await fn();
      const after = this.getMemoryStats();
      const deltaMB = after.heapUsedMB - before.heapUsedMB;
      if (deltaMB > 10) logger.debug('Memory after operation', { operation, deltaMB, afterMB: after.heapUsedMB });
      this.check();
      return result;
    } catch (err) {
      this.check();
      throw err;
    }
  }
}

export const memoryGuard = new MemoryGuard();
