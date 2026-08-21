import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { s3KeyForHrDocumentUpload, getS3Bucket, getS3BaseUrl } from '@/modules/rss-feeds/utils/image-to-s3';

interface PresignBody { filename?: string; contentType?: string; }

const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/**
 * POST /api/employee/documents/presign — presigned S3 PUT URL for a plain employee's own
 * onboarding-document upload. Separate from /api/admin/presign because that route is gated by
 * the main admin JWT, which an isolated employee session never has; Publisher/Event Admin reuse
 * /api/admin/presign directly since they do authenticate through that system.
 */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<PresignBody>(request);
    if (errorResponse) return errorResponse;
    const { filename, contentType } = body || {};
    if (!filename || !contentType) {
      return NextResponse.json({ success: false, error: 'Missing filename or contentType' }, { status: 400 });
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ success: false, error: 'Only PDF or image files (JPG, PNG, WEBP, HEIC) are accepted for documents.' }, { status: 400 });
    }

    const key = s3KeyForHrDocumentUpload(filename);
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

    const s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `${baseUrl}/${key}`;

    return NextResponse.json({ success: true, data: { uploadUrl, fileUrl, key } });
  } catch (error) {
    console.error('[Employee Documents Presign] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
