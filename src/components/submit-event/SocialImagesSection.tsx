"use client";

import { useRef, useState } from "react";
import { IMAGE_SPECS, SOCIAL_PLATFORMS } from "./constants";
import type { SocialImageData } from "./types";
import {
  MAX_UPLOAD_BYTES,
  compressImage,
  hasAllowedImageExtension,
  isAllowedImageFile,
  uploadFileToS3,
} from "./imageUpload";

interface SocialImagesSectionProps {
  socialImages: SocialImageData;
  onChange: (data: SocialImageData) => void;
}

export function SocialImagesSection({ socialImages, onChange }: SocialImagesSectionProps) {
  const [openSlots, setOpenSlots] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const spec = IMAGE_SPECS.social;

  function togglePlatform(key: string) {
    setOpenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setSlotError(key: string, msg: string) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

  async function handleFile(key: string, file: File) {
    if (!isAllowedImageFile(file)) {
      setSlotError(key, "Only JPG, JPEG, or PNG files are allowed.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setSlotError(key, "This image is larger than 20MB — please use a smaller file.");
      return;
    }
    setBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const toUpload = await compressImage(file);
      const fileUrl = await uploadFileToS3(toUpload);
      onChange({ ...socialImages, [key]: [...(socialImages[key] || []), { src: fileUrl, filename: file.name }] });
      setSlotError(key, "");
    } catch (err) {
      setSlotError(key, err instanceof Error ? err.message : "Couldn't process this image — please try again.");
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
      const input = fileInputRefs.current[key];
      if (input) input.value = "";
    }
  }

  function handleUrlBlur(key: string) {
    const url = (urlDrafts[key] || "").trim();
    if (!url) return;
    if (!hasAllowedImageExtension(url)) {
      setSlotError(key, "Only JPG, JPEG, or PNG files are allowed.");
      return;
    }
    onChange({ ...socialImages, [key]: [...(socialImages[key] || []), { src: url, filename: "" }] });
    setSlotError(key, "");
    setUrlDrafts((prev) => ({ ...prev, [key]: "" }));
  }

  function removeImage(key: string, idx: number) {
    onChange({ ...socialImages, [key]: (socialImages[key] || []).filter((_, i) => i !== idx) });
  }

  return (
    <>
      <div className="field">
        <label>Social Media Images</label>
        <div className="hint">
          JPG/JPEG/PNG only · Recommended {spec.width} × {spec.height} px · Click a platform to add images for it
        </div>
        <div className="platform-toggle-row">
          {SOCIAL_PLATFORMS.map((p) => {
            const key = `social-${p.slot}`;
            const open = openSlots.has(key);
            return (
              <button
                key={key}
                type="button"
                className={"platform-toggle-btn" + (open ? " open" : "")}
                onClick={() => togglePlatform(key)}
              >
                {p.emoji} {p.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="social-platforms-row">
        {SOCIAL_PLATFORMS.map((p) => {
          const key = `social-${p.slot}`;
          if (!openSlots.has(key)) return null;
          const items = socialImages[key] || [];
          const err = errors[key];
          return (
            <div className="field" key={key} id={`field-image-${key}`}>
              <label className="social-platform-label">
                {p.emoji} {p.label}
              </label>
              <div className="social-image-list">
                {items.map((item, idx) => (
                  <div className="social-image-chip" key={idx}>
                    <div className="chip-thumb" style={{ backgroundImage: `url('${item.src}')` }} />
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label="Remove this image"
                      onClick={() => removeImage(key, idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="img-field">
                <div className="img-row">
                  <button
                    type="button"
                    className="upload-btn"
                    disabled={!!busy[key]}
                    onClick={() => fileInputRefs.current[key]?.click()}
                  >
                    {busy[key] ? "Uploading…" : "Upload image"}
                  </button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[key] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(key, file);
                    }}
                  />
                  <input
                    type="url"
                    placeholder="or paste an image link"
                    value={urlDrafts[key] || ""}
                    onChange={(e) => {
                      setUrlDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                      if (err) setSlotError(key, "");
                    }}
                    onBlur={() => handleUrlBlur(key)}
                  />
                </div>
              </div>
              <div className={"field-error" + (err ? " visible" : "")} id={`err-image-${key}`}>
                {err}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
