/**
 * GET /api/debug/post-image-pipeline
 * Diagnostic: see what image URL the app resolves for the latest published post.
 * Uses the same entityToPost flow as the homepage. No secrets returned.
 */
import { NextResponse } from 'next/server';
import { query } from '@/shared/database/connection';
import { entityToPost } from '@/modules/posts/utils/posts.utils';
import type { PostEntity } from '@/modules/posts/domain/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await query<PostEntity>(
      'SELECT * FROM posts WHERE status = ? ORDER BY id DESC LIMIT 1',
      ['published']
    );
    const entity = rows[0];
    if (!entity) {
      return NextResponse.json({
        ok: true,
        hint: 'No published posts. Create or publish a post first.',
        entity: null,
        post: null,
      });
    }

    const entityKeys = Object.keys(entity);
    const raw = entity as unknown as Record<string, unknown>;
    const rawFeatured = raw['featured_image_url'] ?? entity.featured_image_url;
    const rawContent = raw['content'] ?? entity.content;
    const contentPreview =
      typeof rawContent === 'string'
        ? rawContent.slice(0, 300) + (rawContent.length > 300 ? '...' : '')
        : Buffer.isBuffer(rawContent)
          ? `(Buffer, ${rawContent.length} bytes)`
          : String(rawContent).slice(0, 100);

    const post = await entityToPost(entity);

    return NextResponse.json({
      ok: true,
      entity: {
        id: entity.id,
        title: entity.title?.slice(0, 60),
        keys_from_db: entityKeys,
        featured_image_url_raw: rawFeatured == null ? null : String(rawFeatured).slice(0, 200),
        content_type: rawContent == null ? 'null' : Buffer.isBuffer(rawContent) ? 'Buffer' : 'string',
        content_length: typeof rawContent === 'string' ? rawContent.length : Buffer.isBuffer(rawContent) ? rawContent.length : 0,
        content_preview: contentPreview?.slice(0, 200),
      },
      resolved_post: {
        image: post.image ? post.image.slice(0, 250) + (post.image.length > 250 ? '...' : '') : '(empty)',
        image_length: post.image?.length ?? 0,
      },
      hint: post.image
        ? 'Image URL is set. If images still do not show, check browser Network tab (CORS, 404, or 403).'
        : 'No image resolved. Ensure post has featured_image_url or at least one <img src="..."> in content.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error', stack: e instanceof Error ? e.stack : undefined },
      { status: 500 }
    );
  }
}
