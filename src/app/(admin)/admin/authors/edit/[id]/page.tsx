'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken, withAdminToken } from '@/lib/admin-auth';
import { getPresignedUploadUrl } from '@/app/actions/upload-image';

export default function EditAuthorPage() {
  const router = useRouter();
  const params = useParams();
  const authorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    avatarUrl: '',
    authorDescription: '',
    isDefaultAuthor: false,
    isActive: true,
  });

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Author photo must be under 10MB.');
      return;
    }

    const token = getAdminToken();
    if (!token) {
      setError('Your session expired. Please login again.');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const presign = await getPresignedUploadUrl(file.name, file.type, token);
      if (!presign.success || !presign.data) {
        setError(presign.error || 'Failed to prepare image upload.');
        return;
      }
      const uploadData = presign.data;

      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        setError('Failed to upload image to S3.');
        return;
      }

  setFormData((prev) => ({ ...prev, avatarUrl: uploadData.fileUrl }));
    } catch {
      setError('An error occurred while uploading the photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const response = await fetch(withAdminToken(`/api/admin/authors/${authorId}`), {
          headers: getAuthHeaders(),
          cache: 'no-store',
        });
        const data = await response.json();
        if (!data.success) {
          setError(data.error || 'Failed to fetch author');
          setLoading(false);
          return;
        }
        setFormData({
          name: data.data.name || '',
          avatarUrl: data.data.avatarUrl || '',
          authorDescription: data.data.authorDescription || '',
          isDefaultAuthor: Boolean(data.data.isDefaultAuthor),
          isActive: Boolean(data.data.isActive),
        });
      } catch {
        setError('An error occurred while fetching author details');
      } finally {
        setLoading(false);
      }
    };

    if (authorId) fetchAuthor();
  }, [authorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        avatarUrl: formData.avatarUrl,
        authorDescription: formData.authorDescription,
        setAsDefault: formData.isDefaultAuthor,
        isActive: formData.isActive,
      };

      const response = await fetch(withAdminToken(`/api/admin/authors/${authorId}`), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to update author');
        setSaving(false);
        return;
      }

      router.push('/admin/authors');
    } catch {
      setError('An error occurred while updating author');
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading author...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/authors" style={{ color: '#0ea5e9', textDecoration: 'none', display: 'inline-block', marginBottom: '0.75rem' }}>
          ← Back to Authors
        </Link>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>Edit Author</h2>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.9rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Profile Photo</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploadingPhoto}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePhotoUpload(file);
            }}
            style={{ width: '100%', marginBottom: '0.6rem' }}
          />
          {uploadingPhoto && <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.6rem' }}>Uploading photo to S3...</div>}
          <input
            type="url"
            value={formData.avatarUrl}
            onChange={(e) => setFormData((p) => ({ ...p, avatarUrl: e.target.value }))}
            placeholder="Or paste an image URL"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }}
          />
          {formData.avatarUrl && (
            <img
              src={formData.avatarUrl}
              alt="Author preview"
              style={{ width: 64, height: 64, borderRadius: '999px', objectFit: 'cover', marginTop: '0.75rem', border: '1px solid #e2e8f0' }}
            />
          )}
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Author Description</label>
          <textarea
            value={formData.authorDescription}
            onChange={(e) => setFormData((p) => ({ ...p, authorDescription: e.target.value }))}
            placeholder="Enter a brief description of the author (bio, expertise, etc.)"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '100px', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 600, marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={formData.isDefaultAuthor}
              onChange={(e) => setFormData((p) => ({ ...p, isDefaultAuthor: e.target.checked }))}
            />
            Set as default author
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={saving || uploadingPhoto}
            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: 6, background: (saving || uploadingPhoto) ? '#94a3b8' : '#0ea5e9', color: 'white', fontWeight: 600, cursor: (saving || uploadingPhoto) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/authors" style={{ padding: '0.75rem 1.5rem', borderRadius: 6, background: '#e2e8f0', color: '#334155', textDecoration: 'none', fontWeight: 600 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
