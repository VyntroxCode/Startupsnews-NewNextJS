import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth } from '@/shared/middleware/auth.middleware';
import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { entityToPost } from '@/modules/posts/utils/posts.utils';
import {
  isS3Configured,
  isOurS3ImageUrl,
  downloadAndUploadManualPostImageToS3,
  uploadImageToS3,
  s3KeyForAdminUpload,
} from '@/modules/rss-feeds/utils/image-to-s3';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { queryOne } from '@/shared/database/connection';

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

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id]
 * Get post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid post ID',
        },
        { status: 400 }
      );
    }

    const postEntity = await postsRepository.findById(postId);

    if (!postEntity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    const post = await entityToPost(postEntity);
    const rssItem = await queryOne<{ post_id: number }>(
      'SELECT post_id FROM rss_feed_items WHERE post_id = ? LIMIT 1',
      [postId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        authorId: postEntity.author_id,
        categoryId: postEntity.category_id,
        source: rssItem ? 'rss' : 'manual',
        isGone410: Boolean(postEntity.is_gone_410),
        httpStatus: Boolean(postEntity.is_gone_410) ? 410 : (postEntity.status === 'published' ? 200 : 404),
      },
    });
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

async function handleUpdateRequest(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid post ID' },
      { status: 400 }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  let body: Record<string, unknown>;
  let featuredImageFile: File | null = null;
  let formToken: string | null = null;

  try {
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

    // Check post ownership for authors only
    if (auth.user.role === 'author') {
      const existingPost = await postsRepository.findById(postId);
      if (!existingPost) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
      // Authors can edit posts they own OR posts with no author assigned (imported posts)
      if (existingPost.author_id !== null && existingPost.author_id !== auth.user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own posts.' },
          { status: 403 }
        );
      }
    }
    // admins and editors can edit any post

    // Main update logic
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }
    const updateData: Partial<{
      title: string;
      slug: string;
      excerpt: string;
      metaDescription: string;
      content: string;
      categoryId: number;
      authorId: number;
      featuredImageUrl: string;
      featuredImageSmallUrl: string;
      format: "standard" | "video" | "gallery";
      status: "draft" | "published" | "archived";
      featured: boolean;
    }> = {};

    if (body.title !== undefined) updateData.title = String(body.title);
    // Normalize slug: strip leading/trailing slashes + whitespace so the
    // frontend URL resolver can always find the post.
    if (body.slug !== undefined) updateData.slug = String(body.slug).trim().replace(/^\/+|\/+$/g, '');
    if (body.excerpt !== undefined) updateData.excerpt = String(body.excerpt);
    if (body.metaDescription !== undefined) updateData.metaDescription = String(body.metaDescription).trim().slice(0, 160);
    if (body.content !== undefined) updateData.content = String(body.content);
    if (body.categoryId !== undefined) updateData.categoryId = parseInt(String(body.categoryId), 10);
    if (body.authorId !== undefined) updateData.authorId = parseInt(String(body.authorId), 10);

    // Same as RSS: upload featured image file to S3 server-side when sent via multipart
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
        updateData.featuredImageUrl = s3Url;
        updateData.featuredImageSmallUrl = s3Url;
      } catch (err) {
        console.error('Manual post update: failed to upload featured image file to S3', err);
        return NextResponse.json(
          { success: false, error: 'Failed to upload image to storage. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (body.featuredImageUrl !== undefined || body.featuredImageSmallUrl !== undefined) {
      let featuredImageUrl: string | undefined = body.featuredImageUrl != null ? String(body.featuredImageUrl).trim() : undefined;
      let featuredImageSmallUrl: string | undefined = body.featuredImageSmallUrl != null ? String(body.featuredImageSmallUrl).trim() : undefined;
      if (featuredImageUrl && isS3Configured() && !isOurS3ImageUrl(featuredImageUrl)) {
        try {
          const s3Url = await downloadAndUploadManualPostImageToS3(featuredImageUrl);
          if (s3Url) {
            featuredImageUrl = s3Url;
            featuredImageSmallUrl = featuredImageSmallUrl || s3Url;
          }
        } catch (err) {
          console.error('Manual post update: failed to upload image URL to S3', err);
        }
      }
      if (featuredImageUrl !== undefined) updateData.featuredImageUrl = featuredImageUrl;
      if (featuredImageSmallUrl !== undefined) updateData.featuredImageSmallUrl = featuredImageSmallUrl;

      if (updateData.featuredImageUrl !== undefined) {
        updateData.featuredImageUrl = normalizeImageUrlForDb(updateData.featuredImageUrl);
      }
      if (updateData.featuredImageSmallUrl !== undefined) {
        updateData.featuredImageSmallUrl = normalizeImageUrlForDb(updateData.featuredImageSmallUrl) || updateData.featuredImageUrl;
      }
    }

    if (body.format !== undefined) updateData.format = body.format as "standard" | "video" | "gallery";
    if (body.status !== undefined) updateData.status = body.status as "draft" | "published" | "archived";
    if (body.featured !== undefined) updateData.featured = String(body.featured) === 'true' || body.featured === true;

    const entity = await postsService.updatePost(postId, updateData);
    const post = await entityToPost(entity);

    return NextResponse.json({
      success: true,
      data: post,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update post';
    if (msg.includes('Featured image is required to publish')) {
      return NextResponse.json(
        { success: false, error: msg },
        { status: 400 }
      );
    }
    console.error('Error updating post:', error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/posts/[id]
 * Update post. Multipart: auth via header or form _token; no role check.
 */
export async function PUT(
  request: NextRequest,
  ctx: RouteParams
) {
  return handleUpdateRequest(request, ctx);
}

/**
 * POST /api/admin/posts/[id]
 * CloudFront/WAF fallback update path when PUT is blocked at the edge.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteParams
) {
  return handleUpdateRequest(request, ctx);
}

/**
 * DELETE /api/admin/posts/[id]
 * Delete post
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid post ID',
        },
        { status: 400 }
      );
    }

    await postsService.deletePost(postId);

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post',
      },
      { status: 500 }
    );
  }
}

