import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { s3KeyForItTicketAttachment, getS3Bucket, getS3BaseUrl } from '@/modules/rss-feeds/utils/image-to-s3';

interface PresignBody { filename?: string; contentType?: string; }

/** What an employee can attach to an IT ticket: screenshots, PDFs, logs/text, CSV, Office files, ZIP.
 * Never svg/html (rendered as a link to IT staff, so no active content). */
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
]);

/** Browsers often report no MIME type for .log/.zip/.csv — the client then sends octet-stream. */
const OCTET_STREAM_EXTENSIONS = new Set(['log', 'txt', 'csv', 'zip']);

function extensionOf(filename: string): string {
  return (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * POST /api/employee/it-tickets/presign — presigned S3 PUT URL for an IT ticket attachment uploaded
 * from the employee portal. Separate from /api/admin/presign (admin JWT only) and from
 * /api/employee/documents/presign (PDF/images only, HR-document key prefix).
 */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<PresignBody>(request);
    if (errorResponse) return errorResponse;
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
    if (!filename || !contentType) {
      return NextResponse.json({ success: false, error: 'Missing filename or contentType' }, { status: 400 });
    }

    const normalized = contentType.toLowerCase().split(';')[0].trim();
    const allowed = ALLOWED_CONTENT_TYPES.has(normalized)
      || (normalized === 'application/octet-stream' && OCTET_STREAM_EXTENSIONS.has(extensionOf(filename)));
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'This file type can’t be attached. Use an image, PDF, text or log file, CSV, Office document or ZIP.' },
        { status: 400 }
      );
    }

    const key = s3KeyForItTicketAttachment(filename);
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
    // Sign with the exact header the browser will send (api.ts uploads with `file.type || octet-stream`).
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `${baseUrl}/${key}`;

    return NextResponse.json({ success: true, data: { uploadUrl, fileUrl, key } });
  } catch (error) {
    console.error('[Employee IT ticket presign] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to prepare the upload' }, { status: 500 });
  }
}
