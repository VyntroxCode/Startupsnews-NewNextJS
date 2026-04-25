/**
 * Queue interface - abstraction for job queue operations.
 */

import { Job, JobType } from './job-types';

export interface QueueOptions {
  maxAttempts?: number;
  delay?: number;
  priority?: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface IQueue {
  add<T extends Job>(type: JobType, payload: T['payload'], options?: QueueOptions): Promise<T>;
  process(type: JobType, handler: (job: Job) => Promise<void>): void;
  getStats(): Promise<QueueStats>;
  getJob(jobId: string): Promise<Job | null>;
  remove(jobId: string): Promise<void>;
  retry(jobId: string): Promise<void>;
  clear(): Promise<void>;
}
