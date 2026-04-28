import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';
import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { entitiesToAdminListPosts } from '@/modules/posts/utils/posts.utils';
import {
  isS3Configured,
  isOurS3ImageUrl,
  downloadAndUploadManualPostImageToS3,
  uploadImageToS3,
  s3KeyForAdminUpload,
  resolveImageUrlFromWebpage,
  isImageUrl,
} from '@/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml } from '@/modules/rss-feeds/utils/content-extract';
import { parseJsonBody } from '@/shared/utils/parse-json-body';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_URL_LENGTH = 500;

function normalizeImageUrlForDb(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= MAX_IMAGE_URL_LENGTH) return trimmed;

  try {
    const parsed = new URL(trimmed);
    parsed.search = '';
    parsed.hash = '';
    const withoutQuery = parsed.toString();
    if (withoutQuery.length <= MAX_IMAGE_URL_LENGTH) return withoutQuery;
  } catch {
    // Fall through to defensive truncate.
  }

  return trimmed.slice(0, MAX_IMAGE_URL_LENGTH);
}

export const maxDuration = 60; // Allow up to 60s for serverless (e.g. cold DB)

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);

/**
 * GET /api/admin/posts
 * Get all posts (admin view - includes drafts) with pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const source = searchParams.get('source') as 'manual' | 'rss' | null;
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const filters: {
      status?: string;
      limit?: number;
      offset?: number;
      search?: string;
      source?: 'manual' | 'rss';
      categoryId?: number;
      authorId?: number;
      orderByLatestDate?: boolean;
      forAdmin?: boolean;
      restrictThumbnail?: boolean;
    } = {
      limit: Math.min(limit, 100), // Max 100 items per page
      offset,
      orderByLatestDate: true,
      forAdmin: true,
      restrictThumbnail: false,
    };

    if (status) filters.status = status;
    if (search) filters.search = search;
    if (source === 'manual' || source === 'rss') filters.source = source;
    if (categoryId) {
      const catId = parseInt(categoryId, 10);
      if (!isNaN(catId)) filters.categoryId = catId;
    }
    if (authorId) {
      const aId = parseInt(authorId, 10);
      if (!isNaN(aId)) filters.authorId = aId;
    }

    // Run count and list in parallel for lower latency
    const [total, entities] = await Promise.all([
      postsRepository.count(filters),
      postsService.getAllPosts(filters),
    ]);

    const categoryIds = [...new Set(entities.map((e) => e.category_id))];
    const postIds = entities.map((e) => e.id);
    const categoryMap = new Map<number, { name: string; slug: string }>();
    const tagsByPostId = new Map<number, string[]>();
    const feedNameByPostId = new Map<string, string>();

    // Run all batch lookups in parallel
    const [categoryRows, tagRows, rssRows] = await Promise.all([
      categoryIds.length > 0
        ? query<{ id: number; name: string; slug: string }>(
          `SELECT id, name, slug FROM categories WHERE id IN (${categoryIds.map(() => '?').join(',')})`,
          categoryIds
        )
        : Promise.resolve([]),
      postIds.length > 0
        ? query<{ post_id: number; tag_name: string }>(
          `SELECT post_id, tag_name FROM post_tags WHERE post_id IN (${postIds.map(() => '?').join(',')})`,
          postIds
        )
        : Promise.resolve([]),
      postIds.length > 0
        ? query<{ post_id: number; name: string }>(
          `SELECT i.post_id, f.name FROM rss_feed_items i
             JOIN rss_feeds f ON f.id = i.rss_feed_id
             WHERE i.post_id IS NOT NULL AND i.post_id IN (${postIds.map(() => '?').join(',')})`,
          postIds
        )
        : Promise.resolve([]),
    ]);

    for (const row of categoryRows) {
      categoryMap.set(row.id, { name: row.name, slug: row.slug });
    }
    for (const row of tagRows) {
      const arr = tagsByPostId.get(row.post_id) ?? [];
      arr.push(row.tag_name);
      tagsByPostId.set(row.post_id, arr);
    }
    for (const row of rssRows) {
      const key = String(row.post_id);
      if (!feedNameByPostId.has(key)) feedNameByPostId.set(key, row.name);
    }

    let posts = entitiesToAdminListPosts(entities, categoryMap, tagsByPostId);
    if (posts.length > 0) {
      posts = posts.map((p) => ({
        ...p,
        source: feedNameByPostId.has(p.id) ? ('rss' as const) : ('manual' as const),
        rssFeedName: feedNameByPostId.get(p.id),
        isGone410: Boolean((p as { isGone410?: boolean }).isGone410),
        httpStatus: (p as { httpStatus?: number }).httpStatus ?? 404,
      }));
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
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

/**
 * POST /api/admin/posts
 * Create new post.
 * - Multipart: accept featuredImageFile (upload to S3 server-side). Auth via Authorization header or form _token (in case header is stripped).
 * - No role check: any authenticated user can create (admin panel login already restricts to admin/editor).
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  let body: Record<string, unknown>;
  let featuredImageFile: File | null = null;
  let formToken: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    formToken = (formData.get('_token') as string) || null;
    featuredImageFile = (formData.get('featuredImageFile') as File) || null;
    if (featuredImageFile && typeof featuredImageFile === 'object' && featuredImageFile.size === 0) {
      featuredImageFile = null;
    }
    body = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      excerpt: formData.get('excerpt'),
      metaDescription: formData.get('metaDescription'),
      content: formData.get('content'),
      categoryId: formData.get('categoryId'),
      authorId: formData.get('authorId'),
      format: formData.get('format'),
      status: formData.get('status'),
      featured: formData.get('featured'),
      featuredImageUrl: formData.get('featuredImageUrl'),
      featuredImageSmallUrl: formData.get('featuredImageSmallUrl'),
    };
  } else {
    formToken = null;
    const [parsed, parseError] = await parseJsonBody<Record<string, unknown>>(request);
    if (parseError) return parseError;
    body = parsed || {};
  }

  const auth = await getAuthUser(request, formToken ?? undefined);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please log in again.' },
      { status: 401 }
    );
  }

  try {
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Validation
    if (!body.title || !body.slug || !body.excerpt || !body.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, slug, excerpt, and content are required',
        },
        { status: 400 }
      );
    }

    const categoryId = typeof body.categoryId === 'number' ? body.categoryId : parseInt(String(body.categoryId ?? ''), 10);
    const authorId = typeof body.authorId === 'number' ? body.authorId : parseInt(String(body.authorId ?? ''), 10);
    if (isNaN(categoryId) || isNaN(authorId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid category and author are required. Please select a category and ensure you are logged in.',
        },
        { status: 400 }
      );
    }

    let featuredImageUrl: string | undefined = body.featuredImageUrl != null ? String(body.featuredImageUrl).trim() || undefined : undefined;
    let featuredImageSmallUrl: string | undefined = body.featuredImageSmallUrl != null ? String(body.featuredImageSmallUrl).trim() || undefined : undefined;

    // Same as RSS: upload featured image file to S3 server-side (no separate /api/admin/upload call)
    if (featuredImageFile && isS3Configured()) {
      try {
        if (featuredImageFile.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: `Image must be under ${MAX_FILE_SIZE / 1024 / 1024}MB` },
            { status: 400 }
          );
        }
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(featuredImageFile.type)) {
          return NextResponse.json(
            { success: false, error: 'Invalid image type. Use JPEG, PNG, GIF, or WebP.' },
            { status: 400 }
          );
        }
        const bytes = await featuredImageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = (featuredImageFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const contentTypeImg = CONTENT_TYPES[ext] || featuredImageFile.type || 'image/jpeg';
        const key = s3KeyForAdminUpload(featuredImageFile.name);
        const s3Url = await uploadImageToS3(key, buffer, contentTypeImg);
        featuredImageUrl = s3Url;
        featuredImageSmallUrl = s3Url;
      } catch (err) {
        console.error('Manual post: failed to upload featured image file to S3', err);
        return NextResponse.json(
          { success: false, error: 'Failed to upload image to storage. Please try again.' },
          { status: 500 }
        );
      }
    }

    // If URL provided (no file): mirror RSS flow - download external URL and upload to S3
    if (featuredImageUrl && isS3Configured() && !isOurS3ImageUrl(featuredImageUrl)) {
      try {
        // If URL is a webpage (not direct image), try to extract og:image
        if (!isImageUrl(featuredImageUrl)) {
          console.log(`Featured URL is webpage, attempting to extract og:image: ${featuredImageUrl}`);
          const resolvedImageUrl = await resolveImageUrlFromWebpage(featuredImageUrl);
          if (resolvedImageUrl) {
            console.log(`Extracted og:image: ${resolvedImageUrl}`);
            featuredImageUrl = resolvedImageUrl;
          } else {
            console.warn(`Could not extract image from webpage URL: ${featuredImageUrl}`);
            // If we can't extract image from webpage, don't try to upload
            featuredImageUrl = undefined;
          }
        }

        // Now try to download and upload the (possibly resolved) image URL
        if (featuredImageUrl) {
          const s3Url = await downloadAndUploadManualPostImageToS3(featuredImageUrl);
          if (s3Url) {
            featuredImageUrl = s3Url;
            featuredImageSmallUrl = featuredImageSmallUrl || s3Url;
          } else {
            // Download failed - for published posts, we'll reject below
            console.warn(`Failed to download featured image: ${featuredImageUrl}`);
            featuredImageUrl = undefined;
          }
        }
      } catch (err) {
        console.error('Manual post: failed to process featured image URL', err);
        // For published posts, validation below will catch this
        featuredImageUrl = undefined;
      }
    }
    if (featuredImageUrl && !featuredImageSmallUrl) {
      featuredImageSmallUrl = featuredImageUrl;
    }
    featuredImageUrl = normalizeImageUrlForDb(featuredImageUrl);
    featuredImageSmallUrl = normalizeImageUrlForDb(featuredImageSmallUrl) || featuredImageUrl;

    const status = body.status === 'archived' ? 'archived' : body.status === 'published' ? 'published' : 'draft';
    // Require featured image for publishing; news with no image will not be posted as published
    const hasValidFeatured = Boolean(
      featuredImageUrl && String(featuredImageUrl).trim() && !String(featuredImageUrl).trim().startsWith('https://images.unsplash.com/')
    );
    if (status === 'published' && !hasValidFeatured) {
      return NextResponse.json(
        { success: false, error: 'Featured image is required to publish. Add an image or save as draft.' },
        { status: 400 }
      );
    }

    // Process images in content: extract, upload to S3, replace
    // This mirrors RSS behavior so manual posts also get their images hosted on our S3
    let processedContent = String(body.content || '');
    if (isS3Configured() && processedContent) {
      try {
        const contentImages = extractImageUrlsFromHtml(processedContent, '');
        const urlToS3 = new Map<string, string>();

        // Process sequentially to not overload if many images
        for (const imgUrl of contentImages) {
          // Skip if already our S3
          if (isOurS3ImageUrl(imgUrl)) continue;

          try {
            const s3Url = await downloadAndUploadManualPostImageToS3(imgUrl);
            if (s3Url) {
              urlToS3.set(imgUrl, s3Url);
            }
          } catch (err) {
            console.error(`Failed to upload manual post content image: ${imgUrl}`, err);
            // Continue with original URL
          }
        }

        if (urlToS3.size > 0) {
          for (const [oldUrl, newUrl] of urlToS3) {
            processedContent = processedContent.split(oldUrl).join(newUrl);
          }
        }
      } catch (err) {
        console.error('Error processing manual post content images:', err);
        // Continue with original content
      }
    }

    const entity = await postsService.createPost({
      title: String(body.title),
      slug: String(body.slug).trim().replace(/^\/+|\/+$/g, ''),
      excerpt: String(body.excerpt),
      metaDescription: body.metaDescription != null ? String(body.metaDescription).trim().slice(0, 160) : '',
      content: processedContent,
      categoryId,
      authorId,
      featuredImageUrl,
      featuredImageSmallUrl,
      format: (body.format as 'standard' | 'video' | 'gallery') || 'standard',
      status,
      featured: String(body.featured) === 'true' || body.featured === true,
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Failed to create post (no entity returned)' },
        { status: 500 }
      );
    }

    // Minimal response for create (no entityToPost: avoids S3 presign, content parsing, extra DB in production)
    const created = entity.created_at instanceof Date ? entity.created_at : new Date(entity.created_at);
    const categoryRow = await queryOne<{ name: string; slug: string }>(
      'SELECT name, slug FROM categories WHERE id = ?',
      [entity.category_id]
    );
    const post = {
      id: String(entity.id),
      slug: entity.slug,
      title: entity.title,
      excerpt: entity.excerpt ?? '',
      metaDescription: entity.meta_description ?? entity.excerpt ?? '',
      content: '',
      category: categoryRow?.name ?? 'Uncategorized',
      categorySlug: categoryRow?.slug ?? 'uncategorized',
      date: created.toISOString().slice(0, 10),
      timeAgo: '',
      publishedAt: created.toISOString(),
      image: featuredImageUrl ?? '',
      imageSmall: featuredImageSmallUrl ?? featuredImageUrl ?? '',
      format: entity.format,
      featured: entity.featured,
      tags: [] as string[],
      status: entity.status ?? 'draft',
    };

    return NextResponse.json({
      success: true,
      data: post,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    const message = error instanceof Error ? error.message : 'Failed to create post';
    if (/already exists/i.test(message)) {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 409 }
      );
    }
    if (/not found|required/i.test(message)) {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
