'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken, withAdminToken } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Author {
  id: number;
  name: string;
  isDefaultAuthor?: boolean;
}

export default function CreatePostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    metaDescription: '',
    content: '',
    categoryId: '',
    authorId: '',
    featuredImageUrl: '',
    featuredImageSmallUrl: '',
    format: 'standard' as 'standard' | 'video' | 'gallery',
    status: 'draft' as 'draft' | 'published' | 'archived',
    featured: false,
  });

  useEffect(() => {
    fetchCategories();
    fetchAuthors();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(withAdminToken('/api/admin/categories?limit=500'), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchAuthors = async () => {
    try {
      const response = await fetch(withAdminToken('/api/admin/authors'), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        const nextAuthors: Author[] = data.data || [];
        setAuthors(nextAuthors);
        setFormData((prev) => {
          if (prev.authorId) return prev;
          const defaultAuthor = nextAuthors.find((a) => a.isDefaultAuthor);
          if (defaultAuthor) {
            return { ...prev, authorId: String(defaultAuthor.id) };
          }
          // Try to find "Team StartupNews.fyi" author first
          const teamAuthor = nextAuthors.find((a) => a.name === 'Team StartupNews.fyi');
          if (teamAuthor) {
            return { ...prev, authorId: String(teamAuthor.id) };
          }
          // Fall back to first author
          return {
            ...prev,
            authorId: nextAuthors[0] ? String(nextAuthors[0].id) : '',
          };
        });
      }
    } catch (err) {
      console.error('Error fetching authors:', err);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('Image must be under 50MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = getAdminToken();
      if (!token) {
        throw new Error('Please log in again (no auth token found)');
      }

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

      setFormData(prev => ({
        ...prev,
        featuredImageUrl: fileUrl,
        featuredImageSmallUrl: fileUrl,
      }));
      setFeaturedImageFile(file);
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setFeaturedImageFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sanitizeHtmlForEdgeSecurity = (html: string): string => {
        return html
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
          .replace(/<(object|embed|meta|link|style)[^>]*?>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(object|embed|meta|link|style)[^>]*?\/?>/gi, '')
          .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
          .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
          .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
      };
      const sanitizedContent = sanitizeHtmlForEdgeSecurity(formData.content);
      const categoryId = formData.categoryId ? parseInt(formData.categoryId, 10) : NaN;
      const authorId = formData.authorId ? parseInt(formData.authorId, 10) : NaN;
      if (!formData.categoryId || isNaN(categoryId)) {
        setError('Please select a category.');
        setLoading(false);
        return;
      }
      if (!formData.authorId || isNaN(authorId)) {
        setError('Please select an author.');
        setLoading(false);
        return;
      }

      // Validate content has actual text (strip HTML tags to check)
      const contentPlainText = sanitizedContent
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .trim();
      if (!contentPlainText || contentPlainText.length < 10) {
        setError('Content is required. Please write at least 10 characters.');
        setLoading(false);
        return;
      }

      // Validate excerpt
      if (!formData.excerpt || formData.excerpt.trim().length < 10) {
        setError('Excerpt is required. Please write at least 10 characters.');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        content: sanitizedContent,
        categoryId,
        authorId,
        featuredImageSmallUrl: formData.featuredImageSmallUrl || formData.featuredImageUrl,
      };

      const isCloudFrontEdgeBlock = async (res: Response): Promise<boolean> => {
        if (res.status !== 403) return false;
        try {
          const body = await res.clone().text();
          return /Generated by cloudfront|The request could not be satisfied|Request blocked/i.test(body);
        } catch {
          return false;
        }
      };

      const createUrl = '/api/admin/posts';
      const createUrlWithToken = withAdminToken(createUrl);
      let response = await fetch(createUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if ((response.status === 401 || response.status === 403) && createUrlWithToken !== createUrl) {
        response = await fetch(createUrlWithToken, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      let data: { success?: boolean; error?: string; data?: unknown } = {};
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch {
        if (await isCloudFrontEdgeBlock(response)) {
          setError('Blocked by CloudFront/WAF (403) before reaching the app. Please ask infra to allow /api/admin/posts for authenticated admin POST traffic.');
        } else {
          setError(response.ok ? 'Invalid response from server.' : `Server error (${response.status}). Please try again.`);
        }
        setLoading(false);
        return;
      }

      if (!response.ok) {
        if (response.status === 403) {
          setError('Blocked by CloudFront/WAF (403) before reaching the app. Please ask infra to allow /api/admin/posts for authenticated admin POST traffic.');
          setLoading(false);
          return;
        }
        setError(data.error || `Failed to create post (${response.status})`);
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.error || 'Failed to create post');
        setLoading(false);
        return;
      }

      router.push('/admin/posts');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while creating the post';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/admin/posts"
          style={{
            color: '#667eea',
            textDecoration: 'none',
            marginBottom: '1rem',
            display: 'inline-block',
          }}
        >
          ← Back to Posts
        </Link>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1a202c',
          marginTop: '0.5rem',
        }}>
          Create New Post
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Slug *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Category *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Author *
          </label>
          <select
            value={formData.authorId}
            onChange={(e) => setFormData((prev) => ({ ...prev, authorId: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          >
            <option value="">Select an author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>{author.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Excerpt *
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
            required
            rows={3}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Meta Description (SEO)
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
            rows={3}
            maxLength={160}
            placeholder="Recommended: 140-160 characters"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            {formData.metaDescription.length}/160 characters
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Content * {(() => {
              const plainText = formData.content.replace(/<[^>]*>/g, '').trim();
              const status = plainText.length < 10 ? '❌ Too short' : '✅ Valid';
              const color = plainText.length < 10 ? '#e53e3e' : '#22543d';
              return <span style={{ color, fontSize: '0.875em', fontWeight: 'normal' }}>({status} - {plainText.length} characters)</span>;
            })()}
          </label>
          <RichTextEditor
            value={formData.content}
            onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
            placeholder="Write your news article content..."
            minHeight={280}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Featured Image
          </label>
          {formData.featuredImageUrl && (
            <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
              <img
                src={formData.featuredImageUrl}
                alt="Preview"
                style={{ maxWidth: 300, maxHeight: 200, borderRadius: 4, border: '1px solid #e2e8f0' }}
              />
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, featuredImageUrl: '', featuredImageSmallUrl: '' }));
                  setFeaturedImageFile(null);
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
              padding: '0.75rem 1.5rem',
              background: uploading ? '#cbd5e0' : '#667eea',
              color: 'white', borderRadius: 4,
              cursor: uploading ? 'wait' : 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
              display: 'inline-block', textAlign: 'center',
            }}>
              {uploading ? 'Uploading...' : 'Choose image (uploads immediately)'}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="url"
                value={formData.featuredImageUrl}
                onChange={(e) => {
                  setFormData((p) => ({
                    ...p,
                    featuredImageUrl: e.target.value,
                    featuredImageSmallUrl: e.target.value || p.featuredImageSmallUrl,
                  }));
                  setFeaturedImageFile(null);
                }}
                placeholder="Or enter image URL"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Select an image to upload it immediately. The URL will appear above.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Format
          </label>
          <select
            value={formData.format}
            onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value as 'standard' | 'video' | 'gallery' }))}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          >
            <option value="standard">Standard</option>
            <option value="video">Video</option>
            <option value="gallery">Gallery</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'archived' }))}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ fontWeight: '500', color: '#4a5568' }}>Featured Post</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading || uploading}
            style={{
              padding: '0.75rem 2rem',
              background: loading || uploading ? '#a0aec0' : '#667eea',
              color: 'white', border: 'none', borderRadius: '4px',
              fontSize: '1rem', fontWeight: '500',
              cursor: loading || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
          <Link
            href="/admin/posts"
            style={{
              padding: '0.75rem 2rem', background: '#e2e8f0', color: '#4a5568',
              borderRadius: '4px', textDecoration: 'none', fontSize: '1rem', fontWeight: '500', display: 'inline-block',
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
