'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken } from '@/lib/admin-auth';
import ImageUpload from '@/components/admin/ImageUpload';

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const bannerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    linkText: '',
    order: 0,
    isActive: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (bannerId) {
      fetchBanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId]);

  const fetchBanner = async () => {
    try {
      const response = await fetch(`/api/admin/banners/${bannerId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch banner');
        setLoading(false);
        return;
      }

      const banner = data.data;
      // Format dates for input fields
      const startDate = banner.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '';
      const endDate = banner.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '';

      setFormData({
        title: banner.title || '',
        description: banner.description || '',
        imageUrl: banner.imageUrl || '',
        linkUrl: banner.linkUrl || '',
        linkText: banner.linkText || '',
        order: banner.order || 0,
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        startDate,
        endDate,
      });
    } catch {
      setError('An error occurred while fetching the banner');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = getAdminToken();
      const requestBody = {
        ...formData,
        order: parseInt(formData.order.toString(), 10) || 0,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      // Primary request uses auth headers only (safer with WAF than embedding JWT in body).
      let response = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      // Fallback if a proxy strips auth headers for this route.
      if (response.status === 401 && token) {
        response = await fetch(`/api/admin/banners/${bannerId}?_token=${encodeURIComponent(token)}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });
      }

      // Safely parse response — WAF may return HTML on 403
      const text = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (response.status === 401) {
          setError('Session expired. Please log out and log back in.');
        } else if (response.status === 403) {
          setError('Access denied (403). Please log out and log back in.');
        } else {
          setError(`Server error (${response.status}). Please try again.`);
        }
        setSaving(false);
        return;
      }

      if (!response.ok || !data.success) {
        setError((data.error as string) || 'Failed to update banner');
        setSaving(false);
        return;
      }

      router.push('/admin/banners');
    } catch {
      setError('An error occurred while updating the banner');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Loading banner...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/admin/banners"
          style={{
            color: '#48bb78',
            textDecoration: 'none',
            marginBottom: '1rem',
            display: 'inline-block',
          }}
        >
          ← Back to Banners
        </Link>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1a202c',
          marginTop: '0.5rem',
        }}>
          Edit Banner
        </h1>
      </div>

      {error && (
        <div style={{
          background: '#fed7d7',
          color: '#c53030',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Image URL *
          </label>
          <ImageUpload
            value={formData.imageUrl}
            onChange={(url) => setFormData({ ...formData, imageUrl: url })}
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#718096' }}>
            Recommended size: 1200 x 200 (same as homepage banner ratio)
          </p>
          {formData.imageUrl && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={formData.imageUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Link URL
          </label>
          <input
            type="url"
            value={formData.linkUrl}
            onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
            placeholder="https://example.com"
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Link Text
          </label>
          <input
            type="text"
            value={formData.linkText}
            onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
            placeholder="Learn More"
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Display Order
          </label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
            min="0"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
          <p style={{
            marginTop: '0.5rem',
            fontSize: '0.875rem',
            color: '#718096',
          }}>
            Lower numbers appear first in the carousel
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{
                width: '1.25rem',
                height: '1.25rem',
              }}
            />
            Active
          </label>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Start Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            End Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
        }}>
          <Link
            href="/admin/banners"
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#4a5568',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              background: saving ? '#a0aec0' : '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

