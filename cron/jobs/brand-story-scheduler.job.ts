import { createLogger } from '@/shared/utils/logger';
import { BrandStoriesRepository } from '@/modules/brand-stories/repository/brand-stories.repository';

const log = createLogger('brand-story-scheduler');
const repo = new BrandStoriesRepository();

export class BrandStorySchedulerJob {
  async execute(): Promise<{ published: number }> {
    const published = await repo.publishDue();
    if (published > 0) {
      log.info('Brand story scheduler: published due brand stories', { published });
    }
    return { published };
  }
}
