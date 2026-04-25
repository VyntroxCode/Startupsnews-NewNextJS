import { NextRequest, NextResponse } from 'next/server';
import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { entitiesToPosts } from '@/modules/posts/utils/posts.utils';
import { getCache, setCache } from '@/shared/cache/redis.client';

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);

/**
 * GET /api/search
 * Search posts and events
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const type = searchParams.get('type') || 'posts'; // 'posts', 'events', or 'all'
    const limit = searchParams.get('limit');

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required',
        },
        { status: 400 }
      );
    }

    const parsed = limit ? parseInt(limit, 10) : 20;
    const validLimit = Math.min(Math.max(1, !isNaN(parsed) && parsed > 0 ? parsed : 20), 50);

    const cacheKey = `api:search:${type}:${q.toLowerCase().slice(0, 120)}:${validLimit}`;
    const cached = await getCache<{ success: boolean; data: { posts?: unknown[]; events?: unknown[] }; query: string }>(
      cacheKey
    );
    if (cached) {
      return NextResponse.json(cached);
    }

    const results: {
      posts?: unknown[];
      events?: unknown[];
    } = {};

    if (type === 'posts' || type === 'all') {
      const postEntities = await postsService.searchPosts(q, validLimit);
      const posts = await entitiesToPosts(postEntities);
      results.posts = posts.map(({ content: _c, ...rest }) => rest);
    }

    // Events search can be added later when EventsService has search method
    // if (type === 'events' || type === 'all') {
    //   const eventEntities = await eventsService.searchEvents(q, validLimit);
    //   results.events = eventEntities.map(entityToEvent);
    // }

    const payload = {
      success: true,
      data: results,
      query: q,
    };
    await setCache(cacheKey, payload, 45);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search',
      },
      { status: 500 }
    );
  }
}

