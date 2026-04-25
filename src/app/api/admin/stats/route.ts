import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';

export const maxDuration = 30;

// Initialize repositories
const postsRepository = new PostsRepository();
const eventsRepository = new EventsRepository();
const categoriesRepository = new CategoriesRepository();

/**
 * GET /api/admin/stats
 * Get dashboard statistics (batch endpoint)
 */
export async function GET(request: NextRequest) {
  // Allow both editors and authors to view basic stats
  const auth = await requireAuth(request, 'author');
  if (auth instanceof NextResponse) return auth;

  try {
    // Fetch all stats in parallel for better performance
    const [postsCount, eventsCount, categoriesCount] = await Promise.all([
      postsRepository.count({}),
      eventsRepository.count({}),
      categoriesRepository.count({}),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        posts: postsCount,
        events: eventsCount,
        categories: categoriesCount,
        users: 1, // We know there's at least 1 admin user
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}

