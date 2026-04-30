'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { EVENTS_REGION_ORDER } from '@/lib/events-constants';
import { getPresignedUploadUrl } from '@/app/actions/upload-image';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    description: '',
    location: '',
    eventDate: '',
    eventEndDate: '',
    eventTime: '',
    eventEndTime: '',
    imageUrl: '',
    externalUrl: '',
    status: 'upcoming' as 'upcoming' | 'ongoing' | 'past' | 'cancelled',
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch event');
        setLoading(false);
        return;
      }

      const event = data.data;
      // Format date for input field (YYYY-MM-DD)
      const eventDate = event.date ? new Date(event.date).toISOString().split('T')[0] : '';

      setFormData({
        title: event.title || '',
        slug: event.slug || '',
        excerpt: event.excerpt || '',
        description: event.description || '',
        location: event.location || '',
        eventDate: eventDate,
        eventEndDate: event.eventEndDate || '',
        eventTime: event.eventTime || '',
        eventEndTime: event.eventEndTime || '',
        imageUrl: event.image || '',
        externalUrl: event.url || '',
        status: event.status || 'upcoming',
      });
    } catch {
      setError('An error occurred while fetching the event');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUploadForSubmit = async (file: File, token: string): Promise<string> => {
    // Use presigned URL approach to bypass WAF body size limits
    try {
      // Step 1: Get presigned URL from server
      const presignResponse = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
          contentType: file.type || 'image/jpeg',
          _token: token,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error(`Failed to get upload URL (${presignResponse.status})`);
      }

      const presignData = await presignResponse.json();
      if (!presignData.success || !presignData.data?.uploadUrl || !presignData.data?.fileUrl) {
        throw new Error('Invalid presign response');
      }

      const { uploadUrl, fileUrl } = presignData.data;

      // Step 2: Upload directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed (${uploadResponse.status})`);
      }

      return fileUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = getAdminToken();
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        if (!token) {
          throw new Error('Please log in again (no auth token found)');
        }
        finalImageUrl = await handleImageUploadForSubmit(imageFile, token);
      }

      const encodeBase64Utf8 = (value: string) => {
        const bytes = new TextEncoder().encode(value || '');
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        return btoa(binary);
      };

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          slug: '',
          excerpt: '',
          description: '',
          location: '',
          eventDate: '',
          eventTime: '',
          externalUrl: '',
          imageUrl: finalImageUrl,
          status: formData.status,
          titleBase64: encodeBase64Utf8(formData.title || ''),
          slugBase64: encodeBase64Utf8(formData.slug || ''),
          excerptBase64: encodeBase64Utf8(formData.excerpt || ''),
          descriptionBase64: encodeBase64Utf8(formData.description || ''),
          locationBase64: encodeBase64Utf8(formData.location || ''),
          eventDateBase64: encodeBase64Utf8(formData.eventDate || ''),
          eventEndDateBase64: encodeBase64Utf8(formData.eventEndDate || ''),
          eventTimeBase64: encodeBase64Utf8(formData.eventTime || ''),
          eventEndTimeBase64: encodeBase64Utf8(formData.eventEndTime || ''),
          externalUrlBase64: encodeBase64Utf8(formData.externalUrl || ''),
          _token: token,
        }),
      });

      const text = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (response.status === 401) {
          setError('Session expired. Please log out and log back in.');
        } else if (response.status === 403) {
          setError('Access denied (403). Your account may not have sufficient permissions. Please log out and log back in.');
        } else {
          setError(`Server error (${response.status}). Please try again.`);
        }
        setSaving(false);
        return;
      }

      if (!data.success) {
        setError((data.error as string) || 'Failed to update event');
        setSaving(false);
        return;
      }

      router.push('/admin/events');
    } catch {
      setError('An error occurred while updating the event');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Loading event...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/admin/events"
          style={{
            color: '#48bb78',
            textDecoration: 'none',
            marginBottom: '1rem',
            display: 'inline-block',
          }}
        >
          ← Back to Events
        </Link>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1a202c',
          marginTop: '0.5rem',
        }}>
          Edit Event
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
            Slug *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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
            Location * (must match Events section regions)
          </label>
          <select
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Select region</option>
            {EVENTS_REGION_ORDER.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
            {formData.location && !(EVENTS_REGION_ORDER as readonly string[]).includes(formData.location) && (
              <option value={formData.location}>{formData.location} (current – change to a region above to show on site)</option>
            )}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#4a5568',
            }}>
              Event Date *
            </label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
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
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#4a5568',
            }}>
              Event Time
            </label>
            <input
              type="time"
              value={formData.eventTime}
              onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
              Event End Date
            </label>
            <input
              type="date"
              value={formData.eventEndDate}
              onChange={(e) => setFormData({ ...formData, eventEndDate: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
              Event End Time
            </label>
            <input
              type="time"
              value={formData.eventEndTime}
              onChange={(e) => setFormData({ ...formData, eventEndTime: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Excerpt
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={3}
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
            Description
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(description) => setFormData({ ...formData, description })}
            placeholder="Event description (formatting supported)..."
            minHeight={200}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Event Image
          </label>
          {(imagePreview || formData.imageUrl) && (
            <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
              <img
                src={imagePreview || formData.imageUrl}
                alt="Preview"
                style={{ maxWidth: 300, maxHeight: 200, borderRadius: 4, border: '1px solid #e2e8f0' }}
                onError={() => setImagePreview(null)}
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  setFormData((p) => ({ ...p, imageUrl: '' }));
                }}
                style={{
                  position: 'absolute', top: '0.5rem', right: '0.5rem',
                  background: '#e53e3e', color: 'white', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <label style={{
              padding: '0.75rem 1.5rem', background: '#48bb78', color: 'white', borderRadius: 4,
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, display: 'inline-block', textAlign: 'center',
            }}>
              {imageFile ? imageFile.name : 'Choose image (uploaded with event)'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image must be under 5MB');
                      return;
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setFormData((p) => ({ ...p, imageUrl: '' }));
                    setError('');
                  }
                }}
              />
            </label>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, imageUrl: e.target.value }));
                  setImageFile(null);
                  setImagePreview(null);
                }}
                placeholder="Or enter image URL"
                style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Choose a file to upload with the event (same as RSS: image is uploaded to S3 when you save). Or paste an image URL.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            External URL
          </label>
          <input
            type="url"
            value={formData.externalUrl}
            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
            placeholder="https://..."
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'upcoming' | 'ongoing' | 'past' | 'cancelled' })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.75rem 2rem',
              background: saving ? '#a0aec0' : '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/events"
            style={{
              padding: '0.75rem 2rem',
              background: '#e2e8f0',
              color: '#4a5568',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              display: 'inline-block',
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

