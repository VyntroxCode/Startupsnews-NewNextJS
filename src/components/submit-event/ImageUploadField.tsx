"use client";

import { useRef, useState } from "react";
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_ERROR,
  ALLOWED_IMAGE_LABEL,
} from "./constants";
import type { ImageSpec } from "./constants";
import {
  MAX_UPLOAD_BYTES,
  compressImage,
  exactSizeError,
  getImageDimensions,
  getUrlImageDimensions,
  hasAllowedImageExtension,
  isAllowedImageFile,
  uploadFileToS3,
} from "./imageUpload";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  required?: boolean;
  spec: ImageSpec;
  /** When set, `spec` is a hard requirement rather than a suggestion: an image of any other
   *  pixel size is rejected, and the hint says "Required size" instead of "Recommended". */
  exactSize?: boolean;
  value: string;
  filename: string;
  error?: string;
  onAccept: (url: string, filename: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}

export function ImageUploadField({
  id,
  label,
  required,
  spec,
  exactSize,
  value,
  filename,
  error,
  onAccept,
  onClear,
  onError,
}: ImageUploadFieldProps) {
  const [busy, setBusy] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldId = `field-image-${id}`;
  const errId = `err-image-${id}`;

  async function handleFile(file: File) {
    if (!isAllowedImageFile(file)) {
      onError(ALLOWED_IMAGE_ERROR);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("This image is larger than 20MB — please use a smaller file.");
      return;
    }
    setBusy(true);
    try {
      // Checked BEFORE the upload so a wrong-sized image never reaches S3, and checked on the
      // original file because compressImage would resize it out of spec on the way past.
      if (exactSize) {
        const dims = await getImageDimensions(file);
        if (!dims || dims.width !== spec.width || dims.height !== spec.height) {
          onError(exactSizeError(spec, dims));
          return;
        }
      }
      // Compression is skipped for a fixed-size field for the same reason — downscaling to
      // MAX_UPLOAD_DIMENSION would silently break the exact match we just verified. These
      // images are capped at the spec's own size anyway, so there is nothing to gain.
      const toUpload = exactSize ? file : await compressImage(file);
      const fileUrl = await uploadFileToS3(toUpload);
      setUrlDraft("");
      onAccept(fileUrl, file.name);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't process this image — please try again.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUrlBlur() {
    const url = urlDraft.trim();
    if (!url || url === value) return;
    if (!hasAllowedImageExtension(url)) {
      onError(ALLOWED_IMAGE_ERROR);
      return;
    }
    if (exactSize) {
      setBusy(true);
      const dims = await getUrlImageDimensions(url);
      setBusy(false);
      // A link we couldn't load at all is accepted rather than rejected — see
      // getUrlImageDimensions. Only a size we could actually read and that disagrees is an error.
      if (dims && (dims.width !== spec.width || dims.height !== spec.height)) {
        onError(exactSizeError(spec, dims));
        return;
      }
    }
    onAccept(url, "");
  }

  function handleUrlChange(v: string) {
    setUrlDraft(v);
    if (!v) {
      onClear();
      return;
    }
    if (error) onError("");
  }

  return (
    <div className={"field" + (error ? " has-error" : "")} id={fieldId}>
      <label>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="img-field">
        <div className="img-row">
          <button
            type="button"
            className="upload-btn"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <input
            type="url"
            placeholder="or paste an image link"
            value={urlDraft}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={handleUrlBlur}
          />
          <div className="img-thumb" style={{ display: value ? "block" : "none", backgroundImage: value ? `url('${value}')` : undefined }} />
        </div>
        <div className="img-filename" style={{ display: filename ? "block" : "none" }}>
          {filename}
        </div>
      </div>
      <div className="hint">
        {ALLOWED_IMAGE_LABEL} only · {exactSize ? "Required size" : "Recommended"} {spec.width} × {spec.height} px
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id={errId}>
        {error}
      </div>
    </div>
  );
}
