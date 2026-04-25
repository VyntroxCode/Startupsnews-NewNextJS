import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/shared/middleware/auth.middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  isS3Configured,
  uploadImageToS3,
  s3KeyForAdminUpload,
} from '@/modules/rss-feeds/utils/image-to-s3';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '52428800'); // 50MB default

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * CORS headers helper
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * OPTIONS /api/admin/media/ingest
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

/**
 * POST /api/admin/media/ingest
 * Upload image/file. Supports multipart/form-data (standard) and application/json (Base64 fallback).
 */
export async function POST(request: NextRequest) {
  // Log request details for debugging
  const authHeader = request.headers.get('authorization');
  const contentType = request.headers.get('content-type') || '';

  console.error('[Upload] Request received:', {
    method: request.method,
    url: request.url,
    contentType,
    hasAuthHeader: !!authHeader,
  });

  const auth = await getAuthUser(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please log in again.' },
      { status: 401, headers: getCorsHeaders() }
    );
  }

  try {
    let fileBuffer: Buffer;
    let fileName: string;
    let fileMimeType: string;

    // Handle JSON Base64 Upload (Fallback for WAF 403s on multipart)
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json();
        const { file, filename, type } = body;

        if (!file || !filename || !type) {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON payload. Required: file (base64), filename, type' },
            { status: 400, headers: getCorsHeaders() }
          );
        }

        // Decode Base64 (strip data:image/xyz;base64, prefix if present)
        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        fileName = filename;
        fileMimeType = type;

        console.log(`[Upload] Processing Base64 upload: ${fileName} (${fileBuffer.length} bytes)`);
      } catch (err) {
        return NextResponse.json(
          { success: false, error: 'Failed to parse JSON body' },
          { status: 400, headers: getCorsHeaders() }
        );
      }
    }
    // Handle Multipart Upload (Standard)
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400, headers: getCorsHeaders() }
        );
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      fileName = file.name;
      fileMimeType = file.type;
    }
    else {
      return NextResponse.json(
        { success: false, error: `Unsupported Content-Type: ${contentType}` },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileMimeType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const fileExtension = (fileName.split('.').pop() || 'jpg').toLowerCase();
    const finalContentType = CONTENT_TYPES[fileExtension] || fileMimeType || 'image/jpeg';

    if (isS3Configured()) {
      try {
        const key = s3KeyForAdminUpload(fileName);
        const fileUrl = await uploadImageToS3(key, fileBuffer, finalContentType);
        const finalFileName = key.split('/').pop() || fileName;

        return NextResponse.json({
          success: true,
          data: {
            url: fileUrl,
            fileName: finalFileName,
            size: fileBuffer.length,
            type: finalContentType,
          },
        }, { headers: getCorsHeaders() });
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        return NextResponse.json(
          { success: false, error: `S3 upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}` },
          { status: 500, headers: getCorsHeaders() }
        );
      }
    }

    // Fallback: local upload
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const savedFileName = `${timestamp}-${randomString}.${fileExtension}`;
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    const filePath = join(UPLOAD_DIR, savedFileName);
    await writeFile(filePath, fileBuffer);
    const fileUrl = `/uploads/${savedFileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: savedFileName,
        size: fileBuffer.length,
        type: finalContentType,
      },
    }, { headers: getCorsHeaders() });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
