import { ALLOWED_IMAGE_EXT_RE, ALLOWED_IMAGE_MIME } from "./constants";
import type { ImageSpec } from "./constants";

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Hard ceiling before we even attempt to compress/upload — protects against pathological files hanging the browser. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Longer-side cap for uploads. Comfortably covers the banner spec (2438px) without shrinking already-reasonable images. */
const MAX_UPLOAD_DIMENSION = 2600;
const JPEG_QUALITY = 0.85;

export function isAllowedImageFile(file: File): boolean {
  if (file.type) return ALLOWED_IMAGE_MIME.includes(file.type);
  return ALLOWED_IMAGE_EXT_RE.test(file.name);
}

export function hasAllowedImageExtension(nameOrUrl: string): boolean {
  return ALLOWED_IMAGE_EXT_RE.test(nameOrUrl || "");
}

/** Reads the real pixel size of a File. Resolves null if the browser can't decode it. */
export function getImageDimensions(file: File): Promise<ImageDimensions | null> {
  const objectUrl = URL.createObjectURL(file);
  return measure(objectUrl, () => URL.revokeObjectURL(objectUrl));
}

/**
 * Reads the real pixel size of a remote image URL, so a pasted link is held to the same
 * exact-size rule as an upload. No CORS headers are needed for this — naturalWidth/Height
 * are readable on any loaded <img>; only reading its PIXELS through a canvas is blocked.
 * Resolves null when the image can't be loaded at all (hotlink-blocked, 404, offline), which
 * callers treat as "can't verify" rather than "wrong size" — rejecting a link we simply
 * failed to fetch would block legitimate submissions for a network problem.
 */
export function getUrlImageDimensions(url: string): Promise<ImageDimensions | null> {
  return measure(url);
}

function measure(src: string, cleanup?: () => void): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      cleanup?.();
      resolve(null);
      return;
    }
    const img = new Image();
    const done = (value: ImageDimensions | null) => {
      cleanup?.();
      resolve(value);
    };
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = src;
  });
}

/** The message shown when an image doesn't match a field's fixed size. */
export function exactSizeError(spec: ImageSpec, actual: ImageDimensions | null): string {
  return (
    `This image must be exactly ${spec.width} \u00d7 ${spec.height} px` +
    (actual ? ` \u2014 the one you picked is ${actual.width} \u00d7 ${actual.height} px.` : ".")
  );
}

/**
 * Downscales a File to MAX_UPLOAD_DIMENSION on its longer side before upload.
 * Removing the exact-pixel-dimension requirement means organizers can attach
 * unedited phone/camera photos (often 10-50MB+), which is what made uploads slow —
 * this cuts typical payloads down to a few hundred KB. Falls back to the original
 * file untouched if it's already small enough, or if compression fails for any reason.
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: width, naturalHeight: height } = img;
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(width, height));
      if (!width || !height || scale >= 1) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Keep lossless/modern formats in their own container — re-encoding a WebP or PNG as
      // JPEG would usually make it BIGGER, and the size guard below would then discard the
      // result anyway, so the downscale would be wasted work.
      const outputType =
        file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: outputType }));
        },
        outputType,
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/** Uploads a File to S3 via the public presign endpoint for /submit-event and returns the permanent URL. */
export async function uploadFileToS3(file: File): Promise<string> {
  const presignRes = await fetch("/api/events/submit-event/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name.replace(/[^a-zA-Z0-9.-]/g, "_"),
      contentType: file.type || "image/jpeg",
    }),
  });
  const presignData = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok || !presignData?.success || !presignData?.data?.uploadUrl || !presignData?.data?.fileUrl) {
    throw new Error(presignData?.error || "Failed to get upload URL.");
  }
  const { uploadUrl, fileUrl } = presignData.data;

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Upload to storage failed.");

  return fileUrl as string;
}
