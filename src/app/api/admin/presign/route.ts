import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/shared/middleware/auth.middleware';
import {
    s3KeyForAdminUpload,
    getS3Bucket,
    getS3BaseUrl,
} from '@/modules/rss-feeds/utils/image-to-s3';

/**
 * POST /api/admin/presign
 * Generate a presigned S3 PUT URL for direct client-side upload.
 * Request body is tiny JSON (no file data), so it passes through CloudFront WAF.
 *
 * Body: { filename: string, contentType: string }
 * Returns: { success: true, data: { uploadUrl, fileUrl, key } }
 */
export async function POST(request: NextRequest) {
    let auth = await getAuthUser(request);

    // Parse body early to check for _token fallback if auth failed (headers stripped)
    let body: Record<string, any> = {};
    try {
        body = await request.json();
    } catch (e) {
        // Will be caught below if body is required
    }

    if (!auth) {
        const bodyToken = typeof body._token === 'string' ? body._token.trim() : null;
        if (bodyToken) {
            const { getAuthUserFromToken } = await import('@/shared/middleware/auth.middleware');
            auth = await getAuthUserFromToken(bodyToken);
        }
    }

    if (!auth) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const { filename, contentType } = body;

        if (!filename || !contentType) {
            return NextResponse.json(
                { success: false, error: 'Missing filename or contentType' },
                { status: 400 }
            );
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'];
        const resolvedContentType = allowedTypes.includes(contentType) ? contentType : 'image/jpeg';

        const key = s3KeyForAdminUpload(filename);
        const bucket = getS3Bucket();
        const baseUrl = getS3BaseUrl();

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()?.replace(/^["']|["']$/g, '');
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()?.replace(/^["']|["']$/g, '');
        const region = (process.env.AWS_REGION || 'us-east-1').trim();

        if (!accessKeyId || !secretAccessKey) {
            return NextResponse.json(
                { success: false, error: 'S3 credentials not configured' },
                { status: 500 }
            );
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
            ContentType: resolvedContentType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const fileUrl = `${baseUrl}/${key}`;

        return NextResponse.json({
            success: true,
            data: { uploadUrl, fileUrl, key },
        });
    } catch (error) {
        console.error('[Presign API] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to generate presigned URL' },
            { status: 500 }
        );
    }
}
