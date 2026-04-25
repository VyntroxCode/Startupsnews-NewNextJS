import { NextRequest, NextResponse } from 'next/server';
import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { entityToPost } from '@/modules/posts/utils/posts.utils';
import { getCache, setCache } from '@/shared/cache/redis.client';

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/posts/[slug]
 * Get post by slug
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const cacheKey = `api:post:${slug}`;
    const cached = await getCache<{ success: boolean; data: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const entity = await postsService.getPostBySlug(slug);

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    if (Boolean(entity.is_gone_410)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post is gone',
        },
        { status: 410 }
      );
    }

    // Increment view count (async, don't wait)
    postsService.incrementViewCount(slug).catch(console.error);

    const post = await entityToPost(entity);

    const payload = {
      success: true,
      data: post,
    };
    await setCache(cacheKey, payload, 60);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post',
      },
      { status: 500 }
    );
  }
}

