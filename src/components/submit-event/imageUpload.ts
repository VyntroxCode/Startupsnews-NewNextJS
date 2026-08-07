import { ALLOWED_IMAGE_EXT_RE, ALLOWED_IMAGE_MIME } from "./constants";

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
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
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
