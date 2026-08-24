'use client';

import { useState } from 'react';
import { getAdminToken } from '@/lib/admin-auth';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  accept?: string;
  /** When set, the selected image's pixel dimensions must match this exactly — anything else
   * (even if smaller/larger by a few px) is rejected before it ever reaches the upload step. */
  exactDimensions?: { width: number; height: number };
}

/** Reads actual pixel dimensions off the file itself, not the (possibly stale/absent) EXIF data. */
function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

// Formats a canvas re-encode would just bloat (already-compressed/vector/animated) — upload as-is.
const SKIP_COMPRESSION_TYPES = new Set(['image/gif', 'image/svg+xml']);
// Uploads are a straight-through <img> preview/original-quality link elsewhere in the admin
// panel, so this caps the longest edge generously rather than to any one feature's exact spec —
// large enough that print/hero use still looks sharp, small enough that a 12MB phone photo
// (routinely 4000px+ on the long edge) doesn't cross the wire at full size for no visual gain.
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;

/** Best-effort downscale + re-encode. Returns the original file untouched if anything about this fails or wouldn't help. */
async function compressImageFile(file: File): Promise<File> {
  if (SKIP_COMPRESSION_TYPES.has(file.type) || file.size < 300 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('[ImageUpload] Compression skipped, uploading original:', err);
    return file;
  }
}

/** PUT via XHR (not fetch) so real upload-progress events are available for the progress bar. */
function uploadWithProgress(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed (${xhr.status}). ${xhr.responseText || 'Please try again.'}`));
    };
    xhr.onerror = () => reject(new Error('S3 upload failed — network error. Please try again.'));
    xhr.send(file);
  });
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  required = false,
  accept = 'image/*',
  exactDimensions,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (50MB — same limit as upload route)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    if (exactDimensions) {
      const dims = await getImageDimensions(file);
      if (!dims || dims.width !== exactDimensions.width || dims.height !== exactDimensions.height) {
        setError(
          `Image must be exactly ${exactDimensions.width}×${exactDimensions.height}px` +
          (dims ? ` — this image is ${dims.width}×${dims.height}px.` : '.')
        );
        return;
      }
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = getAdminToken();
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      // Compression re-encodes/downscales — that would break an exact-dimension guarantee
      // (e.g. a 2438px-wide banner exceeds MAX_DIMENSION and would get resized), so skip it here.
      const uploadFile = exactDimensions ? file : await compressImageFile(file);

      const safeFilename = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const presignResponse = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: safeFilename,
          contentType: uploadFile.type || 'image/jpeg',
          _token: token,
        }),
      });

      if (!presignResponse.ok) {
        const txt = await presignResponse.text().catch(() => '');
        throw new Error(`Failed to prepare upload (${presignResponse.status}). ${txt || 'Please try again.'}`);
      }

      const presignResult = await presignResponse.json();
      const uploadUrl = presignResult?.data?.uploadUrl as string | undefined;
      const fileUrl = presignResult?.data?.fileUrl as string | undefined;
      if (!uploadUrl || !fileUrl) {
        throw new Error('Upload URL was not returned by the server.');
      }

      await uploadWithProgress(uploadUrl, uploadFile, setUploadProgress);

      setPreview(fileUrl);
      onChange(fileUrl);

      // Allow re-selecting the same file immediately.
      e.target.value = '';
    } catch (err) {
      console.error('[ImageUpload] Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while uploading the image';
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onChange('');
    setError('');
  };

  const handleDownload = async () => {
    if (!value) return;
    const filename = value.split('/').pop()?.split('?')[0] || 'image';
    try {
      const response = await fetch(value);
      if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[ImageUpload] Direct download failed, opening in a new tab instead:', err);
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '500',
        color: '#4a5568',
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      {preview && (
        <div style={{
          marginBottom: '1rem',
          position: 'relative',
          display: 'inline-block',
        }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: '300px',
              maxHeight: '200px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              objectFit: 'cover',
            }}
            onError={() => setPreview(null)}
          />
          <button
            type="button"
            onClick={removeImage}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label
          style={{
            padding: '0.75rem 1.25rem',
            background: uploading ? '#a0aec0' : '#6366f1',
            color: 'white',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'inline-block',
            textAlign: 'center',
            transition: 'background-color 0.2s, opacity 0.2s',
            boxShadow: '0 4px 10px rgba(99,102,241,0.2)',
          }}
          onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
          onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.backgroundColor = '#6366f1'; }}
        >
          {uploading ? `Uploading… ${uploadProgress}%` : 'Upload Image'}
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {exactDimensions && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
          Required size: exactly {exactDimensions.width}×{exactDimensions.height}px.
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: '#fef2f2',
          color: '#991b1b',
          fontSize: '0.875rem',
          borderRadius: '8px',
          border: '1px solid #fca5a5',
        }}>
          <strong>Upload Error:</strong> {error}
        </div>
      )}

      {value && !error && (
        <button
          type="button"
          onClick={handleDownload}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#fff',
            color: '#4a5568',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#4a5568'; }}
        >
          ⬇ Download image
        </button>
      )}
    </div>
  );
}
