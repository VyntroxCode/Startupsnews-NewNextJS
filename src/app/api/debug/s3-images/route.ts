/**
 * GET /api/debug/s3-images
 * Diagnostic: check why S3 post images might show as placeholder.
 * Safe to call on production; returns no secrets.
 */
import { NextResponse } from 'next/server';
import { query } from '@/shared/database/connection';
import { parseS3UrlToBucketKey, toPresignedUrlIfEnabled } from '@/shared/utils/s3-presign';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID?.trim());
    const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY?.trim());
    const presignOff = process.env.S3_USE_PRESIGNED_URLS === 'false' || process.env.S3_USE_PRESIGNED_URLS === '0';

    const rows = await query<{ id: number; title: string; featured_image_url: string | null }>(
      `SELECT id, title, featured_image_url FROM posts WHERE status = ? 
       ORDER BY (featured_image_url LIKE '%startupnews-media-2026%' OR featured_image_url LIKE '%s3.amazonaws.com%') DESC, id DESC LIMIT 3`,
      ['published']
    );

    const sample = rows[0];
    if (!sample) {
      return NextResponse.json({
        ok: true,
        aws: { hasAccessKeyId: hasKey, hasSecretAccessKey: hasSecret, presignDisabled: presignOff, willPresign: hasKey && hasSecret && !presignOff },
        sample: null,
        hint: 'No published posts in DB.',
      });
    }
    let rawUrl = sample.featured_image_url ?? '';
    if (rawUrl && typeof rawUrl !== 'string') rawUrl = String(rawUrl);
    const rawTruncated = rawUrl ? rawUrl.slice(0, 120) + (rawUrl.length > 120 ? '...' : '') : '(empty)';
    const isS3 = rawUrl ? Boolean(parseS3UrlToBucketKey(rawUrl)) : false;
    let finalUrl = '';
    let presignOk = false;
    if (rawUrl && isS3) {
      try {
        finalUrl = await toPresignedUrlIfEnabled(rawUrl);
        presignOk = finalUrl.includes('X-Amz-Signature') || finalUrl.includes('x-amz-signature');
      } catch (e) {
        finalUrl = '(presign error)';
      }
    } else if (rawUrl) {
      finalUrl = '(not S3 URL – app shows placeholder)';
    } else {
      finalUrl = '(no URL in DB – app shows placeholder)';
    }

    return NextResponse.json({
      ok: true,
      aws: {
        hasAccessKeyId: hasKey,
        hasSecretAccessKey: hasSecret,
        presignDisabled: presignOff,
        willPresign: hasKey && hasSecret && !presignOff,
      },
      sample: {
        postId: sample?.id,
        title: sample?.title?.slice(0, 50),
        featured_image_url_in_db: rawTruncated,
        is_s3_url: isS3,
        final_image_url_preview: finalUrl.slice(0, 100) + (finalUrl.length > 100 ? '...' : ''),
        presigned_used: presignOk,
      },
      hint: !hasKey || !hasSecret
        ? 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in this app’s environment so presigned URLs can be generated.'
        : !isS3 && rawUrl
          ? 'DB has non-S3 image URL; app only shows S3 images. Re-run sync to upload images to S3 and store S3 URLs.'
          : !isS3 && !rawUrl
            ? 'DB has no image URL for this post. Run sync or backfill to set featured_image_url.'
            : presignOk
              ? 'Presigning is working; if images still show placeholder, check browser Network tab for image request (403 = bucket private, use presigned).'
              : 'Presigning may have failed (wrong key/secret or region). Check server logs.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
