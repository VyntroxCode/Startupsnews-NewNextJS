'use client';

import { panelPath } from '@/lib/panel-path';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, CircleX, X } from 'lucide-react';
import { getAuthHeaders, getAdminToken, withAdminToken, getAdminUser } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { PostFormSection, PostField, POST_INPUT, POST_HINT } from '@/components/admin/posts/PostFormLayout';
import { clearFormDraft, loadFormDraft, useFormDraftAutosave } from '@/lib/formDraftStorage';
import { POST_HANDOFF_QUERY, takePostHandoff } from '@/modules/content-studio/lib/article/postHandoff';

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

// Staff authors event admins are allowed to publish press releases under.
// Keep in sync with STAFF_AUTHOR_SLUGS in src/app/sitemap.ts.
const EVENT_ADMIN_AUTHOR_IDS = [38, 221, 223, 224, 37];
const DRAFT_KEY = 'admin_post_draft_create';

type CreatePostFormData = {
  title: string; slug: string; excerpt: string; metaDescription: string; robots: string;
  contentFollow: string; content: string; categoryId: string; authorId: string;
  featuredImageUrl: string; featuredImageSmallUrl: string; imageCredit: string; format: 'standard' | 'video' | 'gallery';
  status: 'draft' | 'published' | 'scheduled' | 'archived'; featured: boolean; scheduledAt: string;
};

/** How much of the form counts as "filled in" for auto-save purposes — title, real content,
 * excerpt, category, author, and a featured image are the fields that actually represent work
 * worth not losing; slug/format/robots etc. either auto-derive or have sensible defaults. */
function completionRatioOf(f: CreatePostFormData): number {
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

export default function CreatePostPage() {
  const router = useRouter();
  const isEventAdmin = getAdminUser()?.role === 'event_admin';
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
    robots: 'index,follow',
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
  const [restorableDraft, setRestorableDraft] = useState<{ savedAt: number; data: CreatePostFormData } | null>(null);
  const [importHtml, setImportHtml] = useState<string | undefined>(undefined);

  const isDraft = formData.status === 'draft';
  const completionRatio = completionRatioOf(formData);
  useFormDraftAutosave(DRAFT_KEY, formData, completionRatio);

  useEffect(() => {
    fetchCategories();
    fetchAuthors();
    // Arrived via Content Studio's "Move to post": prefill instead of offering the old draft.
    const handoff = window.location.search.includes(POST_HANDOFF_QUERY) ? takePostHandoff() : null;
    if (handoff) {
      setFormData((prev) => ({
        ...prev,
        title: handoff.title,
        slug: generateSlug(handoff.title),
        excerpt: handoff.excerpt,
        metaDescription: handoff.metaDescription,
      }));
      setImportHtml(handoff.html);
    } else {
      setRestorableDraft(loadFormDraft<CreatePostFormData>(DRAFT_KEY));
    }
  }, []);

  function restoreDraft() {
    if (!restorableDraft) return;
    setFormData(restorableDraft.data);
    setRestorableDraft(null);
  }
  function discardDraft() {
    clearFormDraft(DRAFT_KEY);
    setRestorableDraft(null);
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(withAdminToken('/api/admin/categories?limit=500'), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        const fetched: Category[] = data.data || [];
        setCategories(fetched);
        if (isEventAdmin) {
          const pressRelease = fetched.find((c) => c.slug === 'press-release');
          if (pressRelease) {
            setFormData((prev) => ({ ...prev, categoryId: String(pressRelease.id) }));
          }
        }
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
        const fetchedAuthors: Author[] = data.data || [];
        const nextAuthors = isEventAdmin
          ? fetchedAuthors.filter((a) => EVENT_ADMIN_AUTHOR_IDS.includes(a.id))
          : fetchedAuthors;
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

      // Drafts save with whatever is filled in; the server fills blanks. Full rules apply on publish.
      if (!isDraft && (!formData.categoryId || isNaN(categoryId))) {
        setError('Please select a category.');
        setLoading(false);
        return;
      }
      if (!isDraft && (!formData.authorId || isNaN(authorId))) {
        setError('Please select an author.');
        setLoading(false);
        return;
      }

      // Validate content has actual text (strip HTML tags to check)
      const contentPlainText = sanitizedContent
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .trim();
      if (!isDraft && (!contentPlainText || contentPlainText.length < 10)) {
        setError('Content is required. Please write at least 10 characters.');
        setLoading(false);
        return;
      }

      // Validate excerpt
      if (!isDraft && (!formData.excerpt || formData.excerpt.trim().length < 10)) {
        setError('Excerpt is required. Please write at least 10 characters.');
        setLoading(false);
        return;
      }

      if (formData.status === 'scheduled' && !formData.scheduledAt) {
        setError('Please select a scheduled date and time.');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        content: sanitizedContent,
        categoryId: isNaN(categoryId) ? undefined : categoryId,
        authorId: isNaN(authorId) ? undefined : authorId,
        featuredImageSmallUrl: formData.featuredImageSmallUrl || formData.featuredImageUrl,
        ...(formData.status === 'scheduled' && formData.scheduledAt
          ? { publishedAt: new Date(formData.scheduledAt).toISOString() }
          : {}),
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

      clearFormDraft(DRAFT_KEY);
      router.push(panelPath('/admin/posts'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while creating the post';
      setError(message);
      setLoading(false);
    }
  };

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
          Create New Post
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
            We found unsaved details from {new Date(restorableDraft.savedAt).toLocaleString('en-IN')} — looks like this form was closed before it was published. Restore them?
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
              onChange={(e) => handleTitleChange(e.target.value)}
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
            {isEventAdmin && <p className={POST_HINT}>Event Admin accounts can only create Press Release posts.</p>}
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
              <option value="index,follow">index, follow (crawl &amp; index)</option>
              <option value="index,nofollow">index, nofollow (index, don&apos;t follow links)</option>
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
              importHtml={importHtml}
            />
          </PostField>
        </PostFormSection>

        <PostFormSection title="Featured image">
          <PostField label="Image" span={2}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white ${uploading ? 'cursor-wait bg-slate-300' : 'cursor-pointer bg-indigo-500 hover:bg-indigo-600'}`}>
                {uploading ? 'Uploading...' : 'Choose image (uploads immediately)'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
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
                }}
                placeholder="Or enter image URL"
                className={`${POST_INPUT} min-w-0 flex-1`}
              />
            </div>
            <p className={POST_HINT}>Select an image to upload it immediately. The URL will appear in the box.</p>
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
          {formData.featuredImageUrl && (
            <div className="col-span-full">
              <div className="relative inline-block">
                <img
                  src={formData.featuredImageUrl}
                  alt="Preview"
                  className="max-h-[200px] max-w-[300px] rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    setFormData((p) => ({ ...p, featuredImageUrl: '', featuredImageSmallUrl: '' }));
                    setFeaturedImageFile(null);
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
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'archived' }))}
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
              disabled={loading || uploading}
              className="box-border cursor-pointer rounded-lg border-0 bg-indigo-500 px-8 py-2.5 text-base font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (isDraft ? 'Saving...' : 'Creating...') : (isDraft ? 'Save Draft' : 'Create Post')}
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
