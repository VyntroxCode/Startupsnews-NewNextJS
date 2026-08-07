import { NextRequest, NextResponse } from 'next/server';
import {
  s3KeyForEventSubmissionUpload,
  getS3Bucket,
  getS3BaseUrl,
} from '@/modules/rss-feeds/utils/image-to-s3';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png']);

/**
 * POST /api/events/submit-event/presign
 * Public, unauthenticated presigned S3 PUT URL for the "Submit Your Event" form.
 * Deliberately scoped to JPG/PNG only and its own S3 key prefix (event-submission-*)
 * so it can't be used to write arbitrary files under the admin upload paths.
 *
 * Body: { filename: string, contentType: string }
 * Returns: { success: true, data: { uploadUrl, fileUrl, key } }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';

  if (!filename || !contentType) {
    return NextResponse.json({ success: false, error: 'Missing filename or contentType' }, { status: 400 });
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ success: false, error: 'Only JPG or PNG images are allowed' }, { status: 400 });
  }

  try {
    const key = s3KeyForEventSubmissionUpload(filename);
    const bucket = getS3Bucket();
    const baseUrl = getS3BaseUrl();

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()?.replace(/^["']|["']$/g, '');
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()?.replace(/^["']|["']$/g, '');
    const region = (process.env.AWS_REGION || 'us-east-1').trim();

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ success: false, error: 'S3 credentials not configured' }, { status: 500 });
    }

    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `${baseUrl}/${key}`;

    return NextResponse.json({ success: true, data: { uploadUrl, fileUrl, key } });
  } catch (error) {
    console.error('[Submit Event Presign] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
