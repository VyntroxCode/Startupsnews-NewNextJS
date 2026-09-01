import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { isS3Configured, uploadImageToS3, s3KeyForIncubatxUpload } from "@/modules/rss-feeds/utils/image-to-s3";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 100) || "file";
}

/**
 * POST /api/incubatx/upload — multipart/form-data { file, field, draftId }.
 *
 * Deliberately NOT the repo's usual presigned-S3-PUT pattern (see /submit-event's image upload
 * or the HR document presign route) — those never let the server see the file bytes, which is
 * incompatible with the security requirement here: extension/declared-content-type alone is not
 * validation, the server must sniff the actual magic bytes. So the client posts the file to this
 * route, which reads it into a buffer, checks size, sniffs the real type via `file-type`
 * (rejecting a mismatch even when the extension looked fine), sanitizes the filename, and only
 * then uploads to S3 itself using the same `uploadImageToS3()` helper other routes use.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const field = String(formData.get("field") || "document");
    const draftId = String(formData.get("draftId") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `That file is ${formatSize(file.size)} — the limit is 10MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const sniffed = await fileTypeFromBuffer(buffer);
    if (!sniffed || !ALLOWED_MIME.has(sniffed.mime)) {
      return NextResponse.json(
        { success: false, error: "That file doesn't look like a PDF, JPG, PNG, or WEBP — please check it and try again." },
        { status: 400 }
      );
    }

    if (!isS3Configured()) {
      console.error("IncubatX upload attempted but S3 is not configured.");
      return NextResponse.json({ success: false, error: "Uploads are temporarily unavailable — please try again shortly." }, { status: 503 });
    }

    const filename = sanitizeFilename(file.name);
    const key = s3KeyForIncubatxUpload(filename, draftId, field);
    const url = await uploadImageToS3(key, buffer, sniffed.mime);

    return NextResponse.json({
      success: true,
      data: { url, filename, size: file.size, mimeType: sniffed.mime },
    });
  } catch (error) {
    console.error("Error uploading IncubatX document:", error);
    return NextResponse.json({ success: false, error: "Upload failed — please try again." }, { status: 500 });
  }
}
