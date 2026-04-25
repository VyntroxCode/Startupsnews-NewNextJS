/**
 * In-memory queue for local/single-instance use.
 */

import { Job, JobType, generateJobId } from './job-types';
import { IQueue, QueueOptions, QueueStats } from './queue.interface';
import { createLogger } from '@/shared/utils/logger';

const log = createLogger('queue');

type JobHandler = (job: Job) => Promise<void>;

export class MemoryQueue implements IQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private stats = { waiting: 0, active: 0, completed: 0, failed: 0 };

  async add<T extends Job>(type: JobType, payload: T['payload'], options: QueueOptions = {}): Promise<T> {
    const jobId = generateJobId();
    const now = new Date();
    const scheduledAt = options.delay ? new Date(now.getTime() + options.delay) : now;
    const job = {
      id: jobId,
      type,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      createdAt: now,
      scheduledAt,
    } as T;
    this.jobs.set(jobId, job);
    this.stats.waiting++;
    log.debug('Job added', { jobId, type, scheduledAt: scheduledAt.toISOString() });
    if (!options.delay) setImmediate(() => this.processJob(jobId));
    else setTimeout(() => this.processJob(jobId), options.delay);
    return job;
  }

  process(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
    log.info('Handler registered', { type });
  }

  async getStats(): Promise<QueueStats> {
    let waiting = 0, active = 0, failed = 0;
    for (const job of this.jobs.values()) {
      if (this.processing.has(job.id)) active++;
      else if (job.attempts >= job.maxAttempts) failed++;
      else waiting++;
    }
    return { waiting, active, completed: this.stats.completed, failed };
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async remove(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      this.processing.delete(jobId);
      log.debug('Job removed', { jobId });
    }
  }

  async retry(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.attempts >= job.maxAttempts) throw new Error(`Job ${jobId} exceeded max attempts`);
    this.processing.delete(jobId);
    setImmediate(() => this.processJob(jobId));
  }

  async clear(): Promise<void> {
    this.jobs.clear();
    this.processing.clear();
    this.stats = { waiting: 0, active: 0, completed: 0, failed: 0 };
    log.info('Queue cleared');
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (this.processing.has(jobId)) return;
    if (job.scheduledAt && job.scheduledAt > new Date()) {
      setTimeout(() => this.processJob(jobId), job.scheduledAt.getTime() - Date.now());
      return;
    }
    if (job.attempts >= job.maxAttempts) {
      this.stats.failed++;
      log.warn('Job exceeded max attempts', { jobId, type: job.type, attempts: job.attempts, maxAttempts: job.maxAttempts });
      return;
    }
    const handler = this.handlers.get(job.type);
    if (!handler) {
      log.warn('No handler for job type', { jobId, type: job.type });
      return;
    }
    this.processing.add(jobId);
    this.stats.waiting = Math.max(0, this.stats.waiting - 1);
    this.stats.active++;
    job.attempts++;
    try {
      log.debug('Processing job', { jobId, type: job.type, attempt: job.attempts });
      await handler(job);
      this.jobs.delete(jobId);
      this.processing.delete(jobId);
      this.stats.active = Math.max(0, this.stats.active - 1);
      this.stats.completed++;
      log.debug('Job completed', { jobId, type: job.type, attempts: job.attempts });
    } catch (error) {
      this.processing.delete(jobId);
      this.stats.active = Math.max(0, this.stats.active - 1);
      log.error('Job failed', error, { jobId, type: job.type, attempt: job.attempts, maxAttempts: job.maxAttempts });
      if (job.attempts < job.maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 60000);
        (job as Job & { scheduledAt?: Date }).scheduledAt = new Date(Date.now() + delay);
        this.stats.waiting++;
        setTimeout(() => this.processJob(jobId), delay);
      } else {
        this.stats.failed++;
      }
    }
  }
}

let queueInstance: MemoryQueue | null = null;

export function getQueue(): IQueue {
  if (!queueInstance) {
    queueInstance = new MemoryQueue();
    log.info('Memory queue initialized');
  }
  return queueInstance;
}
