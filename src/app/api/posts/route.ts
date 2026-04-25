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
 * GET /api/posts
 * Get all posts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorySlug = searchParams.get('category');
    const status = searchParams.get('status') || 'published';
    const featured = searchParams.get('featured');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeContent = searchParams.get('includeContent') === 'true';

    const filters: {
      categorySlug?: string;
      status?: string;
      featured?: boolean;
      limit?: number;
      offset?: number;
    } = {
      status,
    };

    if (categorySlug) {
      filters.categorySlug = categorySlug;
    }

    if (featured !== null) {
      filters.featured = featured === 'true';
    }

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        filters.limit = Math.min(parsedLimit, 50);
      }
    } else {
      filters.limit = 20;
    }

    if (offset) {
      const parsedOffset = parseInt(offset);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        filters.offset = parsedOffset;
      }
    }

    const cacheKey = `api:posts:${JSON.stringify(filters)}:includeContent:${includeContent}`;
    const cached = await getCache<{ data: unknown[]; count: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        count: cached.count,
      });
    }

    const entities = await postsService.getAllPosts(filters);
    const posts = await entitiesToPosts(entities);
    const responseData = includeContent
      ? posts
      : posts.map(({ content, ...rest }) => rest);
    await setCache(cacheKey, { data: responseData, count: responseData.length }, 60);

    return NextResponse.json({
      success: true,
      data: responseData,
      count: responseData.length,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      },
      { status: 500 }
    );
  }
}

