'use server';

import { getAuthUserFromToken } from '@/shared/middleware/auth.middleware';
import {
    s3KeyForAdminUpload,
    getS3Bucket,
    getS3BaseUrl,
} from '@/modules/rss-feeds/utils/image-to-s3';

/**
 * Server Action: Generate a presigned S3 PUT URL for direct client-side upload.
 * This bypasses CloudFront WAF entirely — the client uploads directly to S3.
 *
 * Flow:
 * 1. Client calls this action with filename + content type + token  (tiny JSON, no file data)
 * 2. Server validates auth, generates presigned PUT URL
 * 3. Client PUTs the file directly to S3 using the presigned URL
 * 4. Client uses the final S3 URL in the form
 */
export async function getPresignedUploadUrl(
    filename: string,
    contentType: string,
    token: string
): Promise<{
    success: boolean;
    error?: string;
    data?: { uploadUrl: string; fileUrl: string; key: string };
}> {
    try {
        // 1. Auth check
        if (!token?.trim()) {
            return { success: false, error: 'Unauthorized: No token provided' };
        }
        const auth = await getAuthUserFromToken(token);
        if (!auth) {
            return { success: false, error: 'Unauthorized: Invalid or expired token. Please log in again.' };
        }

        // 2. Validate content type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(contentType)) {
            return { success: false, error: `Invalid file type: ${contentType}. Allowed: JPEG, PNG, GIF, WebP.` };
        }

        // 3. Generate S3 key
        const key = s3KeyForAdminUpload(filename);
        const bucket = getS3Bucket();
        const baseUrl = getS3BaseUrl();

        // 4. Generate presigned PUT URL
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()?.replace(/^["']|["']$/g, '');
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()?.replace(/^["']|["']$/g, '');
        const region = (process.env.AWS_REGION || 'us-east-1').trim();

        if (!accessKeyId || !secretAccessKey) {
            return { success: false, error: 'S3 credentials not configured on server' };
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

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min

        // The final public URL
        const fileUrl = `${baseUrl}/${key}`;

        return {
            success: true,
            data: { uploadUrl, fileUrl, key },
        };
    } catch (error) {
        console.error('[getPresignedUploadUrl] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate upload URL',
        };
    }
}
