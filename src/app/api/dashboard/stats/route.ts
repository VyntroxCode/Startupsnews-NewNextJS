import { NextResponse } from 'next/server';
import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);
const reportsRepository = new ReportsRepository();

export async function GET() {
  try {
    await postsRepository.publishScheduledPosts();

    const [posts, events, categories, reports] = await Promise.all([
      postsRepository.count({ status: 'published' }),
      eventsService.countEvents({ status: 'upcoming' }),
      categoriesService.countCategories(),
      reportsRepository.findActive(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        posts: Number(posts || 0),
        events: Number(events || 0),
        categories: Number(categories || 0),
        totalReports: reports.length,
        freeReports: reports.filter((report) => Number(report.is_active) === 1).length,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
      },
      { status: 500 }
    );
  }
}