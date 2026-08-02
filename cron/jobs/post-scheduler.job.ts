import { createLogger } from '@/shared/utils/logger';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';

const log = createLogger('post-scheduler');
const repo = new PostsRepository();

export class PostSchedulerJob {
  async execute(): Promise<{ published: number }> {
    const published = await repo.publishScheduledPosts();
    if (published > 0) {
      log.info('Post scheduler: published due posts', { published });
    }
    return { published };
  }
}
