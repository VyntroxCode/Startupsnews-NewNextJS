'use client';

import { useState } from 'react';
import { getAdminToken } from '@/lib/admin-auth';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  accept?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  required = false,
  accept = 'image/*',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
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

    setError('');
    setUploading(true);

    try {
      const token = getAdminToken();
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const presignResponse = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: safeFilename,
          contentType: file.type || 'image/jpeg',
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

      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      });

      if (!s3Response.ok) {
        const txt = await s3Response.text().catch(() => '');
        throw new Error(`S3 upload failed (${s3Response.status}). ${txt || 'Please try again.'}`);
      }

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
    }
  };

  const handleUrlChange = (url: string) => {
    setPreview(url);
    onChange(url);
  };

  const removeImage = () => {
    setPreview(null);
    onChange('');
    setError('');
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '500',
        color: '#4a5568',
      }}>
        {label} {required && '*'}
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
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
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
              background: '#e53e3e',
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
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <label
          style={{
            padding: '0.75rem 1.5rem',
            background: uploading ? '#a0aec0' : '#667eea',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'inline-block',
            textAlign: 'center',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>

        <div style={{ flex: 1 }}>
          <input
            type="url"
            value={value}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Or enter image URL"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.75rem',
          background: '#fed7d7',
          color: '#c53030',
          fontSize: '0.875rem',
          borderRadius: '4px',
          border: '1px solid #fca5a5',
        }}>
          <strong>Upload Error:</strong> {error}
        </div>
      )}

      {value && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#718096',
        }}>
          Current: {value}
        </div>
      )}
    </div>
  );
}
