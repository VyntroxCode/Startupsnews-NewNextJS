'use client';

import { panelPath } from '@/lib/panel-path';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, CircleX, X } from 'lucide-react';
import { getAuthHeaders, getAdminToken, withAdminToken, getAdminUser } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { PostFormSection, PostField, POST_INPUT, POST_HINT } from '@/components/admin/posts/PostFormLayout';
import { normalizeRssHtmlForEditor } from '@/shared/utils/editor-html';
import { clearFormDraft, loadFormDraft, useFormDraftAutosave } from '@/lib/formDraftStorage';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Author {
  id: number;
  name: string;
}

// Staff authors event admins are allowed to publish press releases under.
// Keep in sync with STAFF_AUTHOR_SLUGS in src/app/sitemap.ts.
const EVENT_ADMIN_AUTHOR_IDS = [38, 221, 223, 224, 37];

type EditPostFormData = {
  title: string; slug: string; excerpt: string; metaDescription: string; robots: string;
  contentFollow: string; content: string; categoryId: string; authorId: string;
  featuredImageUrl: string; featuredImageSmallUrl: string; imageCredit: string; format: 'standard' | 'video' | 'gallery';
  status: 'draft' | 'published' | 'scheduled' | 'archived'; featured: boolean; scheduledAt: string;
};

/** Same "how much is actually filled in" heuristic as the create-post page's auto-save — see
 * completionRatioOf there. An existing post loaded from the server will already clear the
 * threshold immediately, which is intentional: an accidental navigate-away should protect
 * in-progress edits just as much as a brand-new post. */
function completionRatioOf(f: EditPostFormData): number {
  const contentText = f.content.replace(/<[^>]*>/g, '').trim();
  const filled = [
    f.title.trim().length > 0,
    contentText.length > 10,
    f.excerpt.trim().length > 0,
    !!f.categoryId,
    !!f.authorId,
    !!f.featuredImageUrl,
  ];
  return filled.filter(Boolean).length / filled.length;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const isEventAdmin = getAdminUser()?.role === 'event_admin';

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
    robots: 'index,nofollow',
    contentFollow: 'nofollow',
    content: '',
    categoryId: '',
    authorId: '',
    featuredImageUrl: '',
    featuredImageSmallUrl: '',
    imageCredit: '',
    format: 'standard' as 'standard' | 'video' | 'gallery',
    status: 'draft' as 'draft' | 'published' | 'scheduled' | 'archived',
    featured: false,
    scheduledAt: '',
  });
  const [restorableDraft, setRestorableDraft] = useState<{ savedAt: number; data: EditPostFormData } | null>(null);

  const draftKey = `admin_post_draft_edit_${postId}`;
  const completionRatio = completionRatioOf(formData);
  useFormDraftAutosave(draftKey, formData, completionRatio);

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
    if (postId) setRestorableDraft(loadFormDraft<EditPostFormData>(`admin_post_draft_edit_${postId}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  function restoreDraft() {
    if (!restorableDraft) return;
    setFormData(restorableDraft.data);
    setRestorableDraft(null);
  }
  function discardDraft() {
    clearFormDraft(draftKey);
    setRestorableDraft(null);
  }

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
        const fetchedAuthors: Author[] = data.data || [];
        setAuthors(
          isEventAdmin
            ? fetchedAuthors.filter((a) => EVENT_ADMIN_AUTHOR_IDS.includes(a.id))
            : fetchedAuthors
        );
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

      // Format publishedAt for datetime-local input if post is scheduled
      let scheduledAt = '';
      if (post.status === 'scheduled' && post.publishedAt) {
        const d = new Date(post.publishedAt);
        scheduledAt = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }

      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        metaDescription: post.metaDescription || '',
        robots: (post as { robots?: string }).robots || 'index,follow',
        contentFollow: (post as { contentFollow?: string }).contentFollow || 'nofollow',
        content: normalizedContent,
        categoryId: post.categoryId ? String(post.categoryId) : '',
        authorId: post.authorId ? String(post.authorId) : '',
        featuredImageUrl: post.image || '',
        featuredImageSmallUrl: post.imageSmall || '',
        imageCredit: (post as { imageCredit?: string | null }).imageCredit || '',
        format: post.format || 'standard',
        status: post.status || 'draft',
        featured: post.featured || false,
        scheduledAt,
      });
    } catch {
      setError('An error occurred while fetching the post');
    } finally {
      setLoading(false);
    }
  };

  const isDraft = formData.status === 'draft';

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


      // Drafts save with whatever is filled in (blank fields keep their stored value). Full rules apply on publish.
      if (!isDraft && (isNaN(categoryId) || isNaN(authorId))) {
        setError('Please select both category and author.');
        setSaving(false);
        return;
      }

      if (formData.status === 'scheduled' && !formData.scheduledAt) {
        setError('Please select a scheduled date and time.');
        setSaving(false);
        return;
      }

      // Validate content has actual text (strip HTML tags to check)
      const contentPlainText = sanitizedContent
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .trim();
      if (!isDraft && (!contentPlainText || contentPlainText.length < 10)) {
        setError('Content is required. Please write at least 10 characters.');
        setSaving(false);
        return;
      }

      // Validate excerpt
      if (!isDraft && (!formData.excerpt || formData.excerpt.trim().length < 10)) {
        setError('Excerpt is required. Please write at least 10 characters.');
        setSaving(false);
        return;
      }
      const postUrl = `/api/admin/posts/${postId}`;
      const postUrlWithToken = postUrl;
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
          form.append('imageCredit', formData.imageCredit ?? '');
          if (formData.status === 'scheduled' && formData.scheduledAt) {
            form.append('publishedAt', new Date(formData.scheduledAt).toISOString());
          }
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
          ...(formData.status === 'scheduled' && formData.scheduledAt
            ? { publishedAt: new Date(formData.scheduledAt).toISOString() }
            : {}),
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
          multipart.append('imageCredit', formData.imageCredit ?? '');
          if (formData.status === 'scheduled' && formData.scheduledAt) {
            multipart.append('publishedAt', new Date(formData.scheduledAt).toISOString());
          }

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
      clearFormDraft(draftKey);
      // Use a small delay to let user see the form was saved before redirect
      setTimeout(() => {
        router.push(panelPath('/admin/posts'));
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
      <div style={{ marginBottom: '2.5rem' }}>
        <Link
          href={panelPath('/admin/posts')}
          style={{
            color: '#667eea',
            textDecoration: 'none',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <ArrowLeft size={14} aria-hidden />Back to Posts
        </Link>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Edit Post
        </h1>
      </div>

      {restorableDraft && (
        <div style={{
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          color: '#3730a3',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <span>
            We found unsaved edits from {new Date(restorableDraft.savedAt).toLocaleString('en-IN')} — looks like this form was closed before saving. Restore them?
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" onClick={restoreDraft} style={{
              padding: '0.5rem 1rem', background: '#4f46e5', color: '#fff', border: 'none',
              borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}>
              Restore
            </button>
            <button type="button" onClick={discardDraft} style={{
              padding: '0.5rem 1rem', background: '#fff', color: '#3730a3', border: '1px solid #c7d2fe',
              borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}>
              Discard
            </button>
          </div>
        </div>
      )}

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

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-8">
        <PostFormSection
          title="Post details"
          description="Headline, URL and where the post is filed."
          action={
            <label className="box-border inline-flex cursor-pointer items-center gap-2 rounded-lg border border-solid border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                className="size-4 accent-indigo-500"
              />
              Featured Post
            </label>
          }
        >
          <PostField label="Title" required={!isDraft} span={2}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required={!isDraft}
              placeholder="Article headline"
              className={POST_INPUT}
            />
          </PostField>
          <PostField label="Slug" required={!isDraft}>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              required={!isDraft}
              placeholder="auto-generated-from-title"
              className={`${POST_INPUT} ${formData.slug.length > 75 ? 'border-rose-500! text-rose-600!' : ''}`}
            />
            {formData.slug.length > 75 && (
              <p className="mt-1 text-xs text-rose-600">{formData.slug.length}/75 characters — slug is too long</p>
            )}
          </PostField>

          <PostField label="Category" required={!isDraft}>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
              required={!isDraft}
              disabled={isEventAdmin}
              className={POST_INPUT}
            >
              <option value="">Select a category</option>
              {(isEventAdmin ? categories.filter((c) => c.slug === 'press-release') : categories).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {isEventAdmin && <p className={POST_HINT}>Event Admin accounts can only manage Press Release posts.</p>}
          </PostField>
          <PostField label="Author" required={!isDraft}>
            <select
              value={formData.authorId}
              onChange={(e) => setFormData((prev) => ({ ...prev, authorId: e.target.value }))}
              required={!isDraft}
              className={POST_INPUT}
            >
              <option value="">Select an author</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>
          </PostField>
          <PostField label="Format">
            <select
              value={formData.format}
              onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value as 'standard' | 'video' | 'gallery' }))}
              className={POST_INPUT}
            >
              <option value="standard">Standard</option>
              <option value="video">Video</option>
              <option value="gallery">Gallery</option>
            </select>
          </PostField>
        </PostFormSection>

        <PostFormSection title="Summary & SEO" cols={2} description="What readers and search engines see before opening the post.">
          <PostField label="Excerpt" required={!isDraft}>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              required={!isDraft}
              rows={4}
              placeholder="Short summary shown on listing cards"
              className={`${POST_INPUT} resize-y font-[inherit]`}
            />
          </PostField>
          <PostField label="Meta Description (SEO)">
            <textarea
              value={formData.metaDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
              rows={4}
              maxLength={160}
              placeholder="Recommended: 140-160 characters"
              className={`${POST_INPUT} resize-y font-[inherit]`}
            />
            <p className={POST_HINT}>{formData.metaDescription.length}/160 characters</p>
          </PostField>
          <PostField label="Robots (SEO Indexing)">
            <select
              value={formData.robots}
              onChange={(e) => setFormData((prev) => ({ ...prev, robots: e.target.value }))}
              className={POST_INPUT}
            >
              <option value="index,nofollow">index, nofollow (index, don&apos;t follow links)</option>
              <option value="index,follow">index, follow (crawl &amp; index)</option>
              <option value="noindex,follow">noindex, follow (don&apos;t index, follow links)</option>
              <option value="noindex,nofollow">noindex, nofollow (block completely)</option>
            </select>
          </PostField>
          <PostField label="Content Links">
            <select
              value={formData.contentFollow}
              onChange={(e) => setFormData((prev) => ({ ...prev, contentFollow: e.target.value }))}
              className={POST_INPUT}
            >
              <option value="nofollow">nofollow — external links in content won&apos;t pass authority</option>
              <option value="dofollow">dofollow — external links in content pass authority</option>
            </select>
          </PostField>
        </PostFormSection>

        <PostFormSection title="Content">
          <PostField
            label="Article body"
            required={!isDraft}
            span="full"
            extra={(() => {
              const plainText = formData.content.replace(/<[^>]*>/g, '').trim();
              const tooShort = plainText.length < 10;
              return (
                <span className={`inline-flex items-center gap-1 text-[13px] font-normal ${tooShort ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ({tooShort ? <CircleX size={13} aria-hidden /> : <CircleCheck size={13} aria-hidden />}{tooShort ? 'Too short' : 'Valid'} - {plainText.length} characters)
                </span>
              );
            })()}
          >
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
              placeholder="Write your news article content..."
              minHeight={280}
            />
          </PostField>
        </PostFormSection>

        <PostFormSection title="Featured image">
          <PostField label="Image" span={2}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="inline-flex max-w-full shrink-0 cursor-pointer items-center justify-center truncate rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600">
                {featuredImageFile ? featuredImageFile.name : 'Choose image (uploaded with post)'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
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
                className={`${POST_INPUT} min-w-0 flex-1`}
              />
            </div>
            <p className={POST_HINT}>Choose a file to upload with the post (uploaded to S3 when you save), or paste an image URL.</p>
          </PostField>
          <PostField label="Source">
            <input
              type="text"
              value={formData.imageCredit ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, imageCredit: e.target.value }))}
              maxLength={255}
              placeholder="e.g. Reuters, Unsplash / John Doe"
              className={POST_INPUT}
            />
            <p className={POST_HINT}>Shown under the image on the article page. Leave empty to hide.</p>
          </PostField>
          {(featuredImagePreview || formData.featuredImageUrl) && (
            <div className="col-span-full">
              <div className="relative inline-block">
                <img
                  src={featuredImagePreview || formData.featuredImageUrl}
                  alt="Preview"
                  className="max-h-[200px] max-w-[300px] rounded-lg border border-slate-200"
                  onError={() => setFeaturedImagePreview(null)}
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    setFeaturedImageFile(null);
                    setFeaturedImagePreview(null);
                    setFormData((p) => ({ ...p, featuredImageUrl: '', featuredImageSmallUrl: '' }));
                  }}
                  className="absolute top-2 right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-rose-500 text-white"
                >
                  <X size={14} strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </PostFormSection>

        <PostFormSection title="Publishing">
          <PostField label="Status">
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'scheduled' | 'archived' }))}
              className={POST_INPUT}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </PostField>
          {formData.status === 'scheduled' && (
            <PostField label="Scheduled Date & Time" required>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                required
                className={POST_INPUT}
              />
            </PostField>
          )}
          {/* Save / Cancel sit in the Status row, right-aligned (third column on desktop). */}
          <div className="flex flex-wrap gap-3 self-end md:col-span-2 md:justify-end lg:col-span-1 lg:col-start-3">
            <button
              type="submit"
              disabled={saving}
              className="box-border cursor-pointer rounded-lg border-0 bg-indigo-500 px-8 py-2.5 text-base font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={panelPath('/admin/posts')}
              className="box-border inline-block rounded-lg bg-slate-200 px-8 py-2.5 text-base font-medium text-slate-600! no-underline hover:bg-slate-300"
            >
              Cancel
            </Link>
          </div>
        </PostFormSection>
      </form>
    </div>
  );
}

