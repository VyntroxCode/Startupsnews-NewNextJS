/**
 * Job Types - defines all job types and their payloads.
 */

export enum JobType {
  RSS_FEED_PROCESS = 'rss_feed_process',
  RSS_ITEM_PROCESS = 'rss_item_process',
}

export interface BaseJob {
  id: string;
  type: JobType;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
}

export interface RssFeedProcessJob extends BaseJob {
  type: JobType.RSS_FEED_PROCESS;
  payload: {
    feedId: number;
    feedUrl: string;
    feedName: string;
  };
}

export interface RssItemProcessJob extends BaseJob {
  type: JobType.RSS_ITEM_PROCESS;
  payload: {
    feedId: number;
    itemGuid: string;
    itemData: {
      title: string;
      link: string;
      description?: string;
      content?: string;
      imageUrl?: string;
      publishedAt?: Date;
    };
  };
}

export type Job = RssFeedProcessJob | RssItemProcessJob;

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
