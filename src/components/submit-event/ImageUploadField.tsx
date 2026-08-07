"use client";

import { useRef, useState } from "react";
import type { ImageSpec } from "./constants";
import {
  MAX_UPLOAD_BYTES,
  compressImage,
  hasAllowedImageExtension,
  isAllowedImageFile,
  uploadFileToS3,
} from "./imageUpload";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  required?: boolean;
  spec: ImageSpec;
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
      onError("Only JPG, JPEG, or PNG files are allowed.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("This image is larger than 20MB — please use a smaller file.");
      return;
    }
    setBusy(true);
    try {
      const toUpload = await compressImage(file);
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

  function handleUrlBlur() {
    const url = urlDraft.trim();
    if (!url || url === value) return;
    if (!hasAllowedImageExtension(url)) {
      onError("Only JPG, JPEG, or PNG files are allowed.");
      return;
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
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
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
        JPG/JPEG/PNG only · Recommended {spec.width} × {spec.height} px
      </div>
      <div className={"field-error" + (error ? " visible" : "")} id={errId}>
        {error}
      </div>
    </div>
  );
}
