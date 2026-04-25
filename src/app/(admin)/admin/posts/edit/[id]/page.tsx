'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken, withAdminToken } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { normalizeRssHtmlForEditor } from '@/shared/utils/editor-html';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Author {
  id: number;
  name: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
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
    const loadData = async () => {
      // Load categories and authors first
      await Promise.all([fetchCategories(), fetchAuthors()]);
      // Then load post - no race condition with setTimeout
      if (postId) {
        await fetchPost();
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

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
      const response = await fetch(withAdminToken('/api/admin/authors?includeInactive=true'), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setAuthors(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching authors:', err);
    }
  };

  const fetchPost = async () => {
    try {
      const response = await fetch(withAdminToken(`/api/admin/posts/${postId}`), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch post');
        setLoading(false);
        return;
      }

      const post = data.data;
      const normalizedContent = post.source === 'rss'
        ? normalizeRssHtmlForEditor(post.content || '')
        : post.content || '';

      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        metaDescription: post.metaDescription || '',
        content: normalizedContent,
        categoryId: post.categoryId ? String(post.categoryId) : '',
        authorId: post.authorId ? String(post.authorId) : '',
        featuredImageUrl: post.image || '',
        featuredImageSmallUrl: post.imageSmall || '',
        format: post.format || 'standard',
        status: post.status || 'draft',
        featured: post.featured || false,
      });
    } catch {
      setError('An error occurred while fetching the post');
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
      const sanitizeHtmlForEdgeSecurity = (html: string): string => {
        return html
          // Remove potentially executable tags that often trigger WAF XSS rules.
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
          .replace(/<(object|embed|meta|link|style)[^>]*?>[\s\S]*?<\/\1>/gi, '')
          .replace(/<(object|embed|meta|link|style)[^>]*?\/?>/gi, '')
          // Strip inline event handlers and javascript: URLs.
          .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
          .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
          .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
      };

      const sanitizedContent = sanitizeHtmlForEdgeSecurity(formData.content);
      const categoryId = formData.categoryId ? parseInt(formData.categoryId, 10) : NaN;
      const authorId = formData.authorId ? parseInt(formData.authorId, 10) : NaN;
      if (isNaN(categoryId) || isNaN(authorId)) {
        setError('Please select both category and author.');
        setSaving(false);
        return;
      }

      // Validate content has actual text (strip HTML tags to check)
      const contentPlainText = sanitizedContent
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .trim();
      if (!contentPlainText || contentPlainText.length < 10) {
        setError('Content is required. Please write at least 10 characters.');
        setSaving(false);
        return;
      }

      // Validate excerpt
      if (!formData.excerpt || formData.excerpt.trim().length < 10) {
        setError('Excerpt is required. Please write at least 10 characters.');
        setSaving(false);
        return;
      }
      const postUrl = `/api/admin/posts/${postId}`;
      const postUrlWithToken = token ? `${postUrl}?_token=${encodeURIComponent(token)}` : postUrl;
      const isCloudFrontEdgeBlock = async (res: Response): Promise<boolean> => {
        if (res.status !== 403) return false;
        try {
          const body = await res.clone().text();
          return /Generated by cloudfront|The request could not be satisfied|Request blocked/i.test(body);
        } catch {
          return false;
        }
      };

      let response: Response;
      let blockedByCloudFront = false;
      if (featuredImageFile) {
        const buildForm = () => {
          const form = new FormData();
          form.append('title', formData.title);
          form.append('slug', formData.slug);
          form.append('excerpt', formData.excerpt);
          form.append('metaDescription', formData.metaDescription);
          form.append('content', sanitizedContent);
          form.append('categoryId', String(categoryId));
          form.append('authorId', String(authorId));
          form.append('format', formData.format);
          form.append('status', formData.status);
          form.append('featured', String(formData.featured));
          form.append('featuredImageFile', featuredImageFile);
          // Token in body helps when edge strips auth headers on multipart requests.
          if (token) form.append('_token', token);
          return form;
        };
        // Send both Authorization and X-Admin-Token headers for WAF/proxy resilience.
        const headersMultipart: HeadersInit = {};
        if (token) {
          headersMultipart['Authorization'] = `Bearer ${token}`;
          headersMultipart['X-Admin-Token'] = token;
          headersMultipart['X-Access-Token'] = token;
        }
        response = await fetch(postUrl, {
          method: 'PUT',
          headers: headersMultipart,
          body: buildForm(),
        });

        // Fallback when edge/proxy blocks or strips auth headers.
        if ((response.status === 401 || response.status === 403) && token) {
          response = await fetch(postUrlWithToken, {
            method: 'PUT',
            headers: headersMultipart,
            body: buildForm(),
          });
        }

        // CloudFront/WAF fallback: same update through POST endpoint path.
        if (token && await isCloudFrontEdgeBlock(response)) {
          blockedByCloudFront = true;
          response = await fetch(postUrlWithToken, {
            method: 'POST',
            headers: headersMultipart,
            body: buildForm(),
          });
          blockedByCloudFront = blockedByCloudFront || await isCloudFrontEdgeBlock(response);
        }
      } else {
        const payload = {
          ...formData,
          content: sanitizedContent,
          categoryId,
          authorId,
        };
        const headersJson = getAuthHeaders();
        response = await fetch(postUrl, {
          method: 'PUT',
          headers: headersJson,
          body: JSON.stringify(payload),
        });

        // Fallback when edge/proxy blocks or strips auth headers.
        if ((response.status === 401 || response.status === 403) && token) {
          response = await fetch(postUrlWithToken, {
            method: 'PUT',
            headers: headersJson,
            body: JSON.stringify(payload),
          });
        }

        // CloudFront/WAF fallback: same payload through POST endpoint path.
        if (token && await isCloudFrontEdgeBlock(response)) {
          blockedByCloudFront = true;
          response = await fetch(postUrlWithToken, {
            method: 'POST',
            headers: headersJson,
            body: JSON.stringify(payload),
          });
          blockedByCloudFront = blockedByCloudFront || await isCloudFrontEdgeBlock(response);
        }

        // Secondary fallback: resend as multipart/form-data to avoid JSON body WAF false positives.
        if (!blockedByCloudFront && (response.status === 401 || response.status === 403) && token) {
          const multipart = new FormData();
          multipart.append('title', formData.title);
          multipart.append('slug', formData.slug);
          multipart.append('excerpt', formData.excerpt);
          multipart.append('metaDescription', formData.metaDescription);
          multipart.append('content', sanitizedContent);
          multipart.append('categoryId', String(categoryId));
          multipart.append('authorId', String(authorId));
          multipart.append('format', formData.format);
          multipart.append('status', formData.status);
          multipart.append('featured', String(formData.featured));
          multipart.append('featuredImageUrl', formData.featuredImageUrl || '');
          multipart.append('featuredImageSmallUrl', formData.featuredImageSmallUrl || '');

          const headersMultipart: HeadersInit = {
            Authorization: `Bearer ${token}`,
            'X-Admin-Token': token,
          };

          response = await fetch(postUrlWithToken, {
            method: 'POST',
            headers: headersMultipart,
            body: multipart,
          });
        }
      }

      const responseText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        if (responseText) data = JSON.parse(responseText);
      } catch {
        if (response.status === 401) {
          setError('Session expired. Please log out and log back in.');
        } else if (response.status === 403) {
          setError('Blocked by CloudFront/WAF (403) before reaching the app. Please retry after a short wait or ask infra to allow /api/admin/posts/* for authenticated admin traffic.');
        } else {
          setError(`Server error (${response.status}). Please try again.`);
        }
        setSaving(false);
        return;
      }

      if (!response.ok || !data.success) {
        if (response.status === 403) {
          setError('Blocked by CloudFront/WAF (403) before reaching the app. Please retry after a short wait or ask infra to allow /api/admin/posts/* for authenticated admin traffic.');
          setSaving(false);
          return;
        }
        setError((data.error as string) || `Failed to update post (${response.status})`);
        setSaving(false);
        return;
      }

      // Update form with response data and clear image file
      if (data.data) {
        setFormData(prev => ({
          ...prev,
          featuredImageUrl: (data.data as { image?: string }).image || prev.featuredImageUrl,
          featuredImageSmallUrl: (data.data as { imageSmall?: string }).imageSmall || prev.featuredImageSmallUrl,
        }));
      }
      setFeaturedImageFile(null);
      
      // Show success message, then redirect after 1 second
      setError('');
      setSaving(false);
      // Use a small delay to let user see the form was saved before redirect
      setTimeout(() => {
        router.push('/admin/posts');
      }, 1000);
    } catch (err) {
      console.error('Error saving post:', err);
      setError((err instanceof Error ? err.message : 'An error occurred while updating the post'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Loading post...
      </div>
    );
  }

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
          Edit Post
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
            Category *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
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
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Author *
          </label>
          <select
            value={formData.authorId}
            onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
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
            <option value="">Select an author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>{author.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Excerpt *
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            required
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
            Meta Description (SEO)
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
            rows={3}
            maxLength={160}
            placeholder="Recommended: 140-160 characters"
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
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            {formData.metaDescription.length}/160 characters
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Content * {(() => {
              const plainText = formData.content.replace(/<[^>]*>/g, '').trim();
              const status = plainText.length < 10 ? '❌ Too short' : '✅ Valid';
              const color = plainText.length < 10 ? '#e53e3e' : '#22543d';
              return <span style={{ color, fontSize: '0.875em', fontWeight: 'normal' }}>({status} - {plainText.length} characters)</span>;
            })()}
          </label>
          <RichTextEditor
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            placeholder="Write your news article content..."
            minHeight={280}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>
            Featured Image
          </label>
          {(featuredImagePreview || formData.featuredImageUrl) && (
            <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
              <img
                src={featuredImagePreview || formData.featuredImageUrl}
                alt="Preview"
                style={{ maxWidth: 300, maxHeight: 200, borderRadius: 4, border: '1px solid #e2e8f0' }}
                onError={() => setFeaturedImagePreview(null)}
              />
              <button
                type="button"
                onClick={() => {
                  setFeaturedImageFile(null);
                  setFeaturedImagePreview(null);
                  setFormData((p) => ({ ...p, featuredImageUrl: '', featuredImageSmallUrl: '' }));
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
              padding: '0.75rem 1.5rem', background: '#667eea', color: 'white', borderRadius: 4,
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, display: 'inline-block', textAlign: 'center',
            }}>
              {featuredImageFile ? featuredImageFile.name : 'Choose image (uploaded with post)'}
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
                    setFeaturedImageFile(file);
                    setFeaturedImagePreview(URL.createObjectURL(file));
                    setFormData((p) => ({ ...p, featuredImageUrl: '', featuredImageSmallUrl: '' }));
                    setError('');
                  }
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
                  setFeaturedImagePreview(null);
                }}
                placeholder="Or enter image URL"
                style={{
                  width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Choose a file to upload with the post (same as RSS: image is uploaded to S3 when you save). Or paste an image URL.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
            color: '#4a5568',
          }}>
            Format
          </label>
          <select
            value={formData.format}
            onChange={(e) => setFormData({ ...formData, format: e.target.value as 'standard' | 'video' | 'gallery' })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <option value="standard">Standard</option>
            <option value="video">Video</option>
            <option value="gallery">Gallery</option>
          </select>
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
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ fontWeight: '500', color: '#4a5568' }}>
              Featured Post
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.75rem 2rem',
              background: saving ? '#a0aec0' : '#667eea',
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
            href="/admin/posts"
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

