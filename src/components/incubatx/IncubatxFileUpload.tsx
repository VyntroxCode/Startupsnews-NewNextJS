"use client";

import { useRef, useState } from "react";
import type { IncubatxFileRef } from "./types";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface IncubatxFileUploadProps {
  field: string;
  draftId: string;
  value: IncubatxFileRef | null;
  error?: string;
  onChange: (value: IncubatxFileRef | null) => void;
  onError: (message: string) => void;
}

/**
 * Real upload widget: XHR (not fetch — fetch has no upload-progress event) POST to
 * /api/incubatx/upload, with a progress bar, cancel via `xhr.abort()`, and retry on failure.
 * Client-side 10MB pre-check rejects fast, ahead of the mandatory server-side check.
 */
export function IncubatxFileUpload({ field, draftId, value, error, onChange, onError }: IncubatxFileUploadProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function startUpload(file: File) {
    if (file.size > MAX_BYTES) {
      onError(`That file is ${formatSize(file.size)} — the limit is 10MB.`);
      return;
    }
    setPendingFile(file);
    onError("");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);
    formData.append("draftId", draftId);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/incubatx/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      setPendingFile(null);
      xhrRef.current = null;
      let json: { success?: boolean; data?: IncubatxFileRef; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data) {
        onChange(json.data);
      } else {
        onError(json.error || "Upload failed — please try again.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setPendingFile(null);
      xhrRef.current = null;
      onError("Upload failed — check your connection and try again.");
    };
    xhr.onabort = () => {
      setProgress(null);
      setPendingFile(null);
      xhrRef.current = null;
    };
    xhr.send(formData);
  }

  function cancelUpload() {
    xhrRef.current?.abort();
  }

  if (progress !== null) {
    return (
      <div className="ix-upload-progress">
        <div className="ix-upload-progress-row">
          <span className="ix-upload-progress-name">{pendingFile?.name}</span>
          <button type="button" onClick={cancelUpload}>Cancel</button>
        </div>
        <div className="ix-upload-progress-bar"><div style={{ width: `${progress}%` }} /></div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="ix-doc-chip">
        <span className="ix-doc-chip-name">{value.filename}</span>
        <span className="ix-doc-chip-size">{formatSize(value.size)}</span>
        <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${value.filename}`}>✕</button>
      </div>
    );
  }

  // Re-selecting a file after a failed upload IS the retry — the dropzone stays available
  // (rather than getting stuck showing a dead-end error) with no separate "Retry" control needed.
  return (
    <label className="ix-dropzone">
      <input
        type="file"
        accept={ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startUpload(file);
          e.target.value = "";
        }}
      />
      {error ? "Upload failed — click to try again" : "Click to choose a file — PDF, JPG, PNG or WEBP, up to 10MB"}
    </label>
  );
}
