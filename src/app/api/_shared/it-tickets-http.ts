import { NextResponse } from 'next/server';
import {
  TicketForbiddenError, TicketNotFoundError, TicketValidationError,
} from '@/modules/it-tickets/service/it-tickets.service';

/**
 * HTTP helpers shared by BOTH IT-ticket API surfaces — the admin panel (`/api/admin/it-tickets`)
 * and the employee portal (`/api/employee/it-tickets`). The `_shared` folder is private (not routed).
 */

/** One status-code policy: the client only gets a 4xx for things it caused (bad input, missing row,
 * no access). A DB outage or a bug is a 500, never a misleading "not found" or a 400. */
export function ticketErrorResponse(error: unknown, context: string) {
  if (error instanceof TicketNotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
  if (error instanceof TicketForbiddenError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
  if (error instanceof TicketValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  console.error(`IT tickets: ${context}:`, error);
  return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
}

/**
 * The only URLs an attachment row may point at are the ones our own presign routes hand out: the S3
 * public base (same env vars `getS3BaseUrl()` in modules/rss-feeds/utils/image-to-s3.ts reads) or the
 * CloudFront alias. Anything else (javascript:, a phishing host, …) is rejected — the value is
 * rendered as an <a href> to everyone who can see the ticket.
 */
function allowedAttachmentOrigins(): string[] {
  return [
    process.env.S3_IMAGE_BASE_URL,
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL,
    process.env.NEXT_PUBLIC_IMAGE_CDN_URL,
  ]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .map((v) => v.trim().replace(/\/+$/, ''));
}

export function assertAllowedFileUrl(fileUrl: string): void {
  const origins = allowedAttachmentOrigins();
  if (origins.length === 0) {
    throw new TicketValidationError('File storage is not configured on this server');
  }
  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    throw new TicketValidationError('fileUrl must be an absolute https URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TicketValidationError('fileUrl must be an https URL');
  }
  if (!origins.some((origin) => fileUrl === origin || fileUrl.startsWith(`${origin}/`))) {
    throw new TicketValidationError('fileUrl must point at the media storage this app uploads to');
  }
}

export interface AttachmentInput {
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
}

/** Normalises the POST body of an attachments route. Throws TicketValidationError for a foreign URL;
 * empty name/URL are left for the service to reject with its own message. */
export function parseAttachmentInput(
  body: { fileName?: unknown; fileUrl?: unknown; fileSize?: unknown; mimeType?: unknown } | null | undefined
): AttachmentInput {
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl.trim() : '';
  if (fileUrl) assertAllowedFileUrl(fileUrl);
  return {
    fileName: typeof body?.fileName === 'string' ? body.fileName.trim() : '',
    fileUrl,
    fileSize: typeof body?.fileSize === 'number' && body.fileSize >= 0 ? Math.floor(body.fileSize) : null,
    mimeType: typeof body?.mimeType === 'string' && body.mimeType ? body.mimeType.slice(0, 150) : null,
  };
}
