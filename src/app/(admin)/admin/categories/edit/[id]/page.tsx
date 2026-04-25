'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { getPresignedUploadUrl } from '@/app/actions/upload-image';

interface Category { id: number; name: string; slug?: string; }

export default function EditCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const categoryId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        imageUrl: '',
        parentId: '',
        sortOrder: 0,
    });

    useEffect(() => {
        fetchCategories();
        if (categoryId) {
            fetchCategory();
        }
    }, [categoryId]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories?limit=500', { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success && data.data?.length) {
                setCategories(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchCategory = async () => {
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (!data.success) {
                console.error('Failed to fetch category:', {
                    categoryId,
                    status: res.status,
                    response: data,
                });
                setError(data.error || 'Failed to fetch category');
                setLoading(false);
                return;
            }
            const cat = data.data;
            setFormData({
                name: cat.name || '',
                slug: cat.slug || '',
                description: cat.description || '',
                imageUrl: cat.imageUrl || '',
                parentId: cat.parentId ? String(cat.parentId) : '',
                sortOrder: cat.sortOrder || 0,
            });
        } catch (err) {
            console.error('Error fetching category:', err);
            setError('An error occurred while fetching category');
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData({ ...formData, name, slug: generateSlug(name) });
    };

    const getUploadUrl = async (filename: string, contentType: string, token: string) => {
        try {
            const result = await getPresignedUploadUrl(filename, contentType, token);
            if (result.success && result.data) return result.data;
        } catch (e) {
            console.warn('Server Action presign threw:', e);
        }

        try {
            const res = await fetch('/api/admin/presign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Admin-Token': token,
                },
                body: JSON.stringify({ filename, contentType }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) return data.data;
            }
        } catch (e) {
            console.warn('API presign threw:', e);
        }
        throw new Error('Could not get upload URL. Please try again.');
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
            if (!token) throw new Error('Please log in again (no auth token found)');

            const { uploadUrl, fileUrl } = await getUploadUrl(file.name, file.type, token);

            const s3Response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!s3Response.ok) {
                throw new Error(`S3 upload failed (${s3Response.status}). Please try again.`);
            }

            setFormData(prev => ({ ...prev, imageUrl: fileUrl }));
            setImageFile(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload image');
            setImageFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const parentId = formData.parentId ? parseInt(formData.parentId, 10) : undefined;
            // if trying to set parentId to itself
            if (parentId === parseInt(categoryId, 10)) {
                setError('A category cannot be its own parent.');
                setSaving(false);
                return;
            }

            const payload = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                imageUrl: formData.imageUrl,
                parentId: parentId,
                sortOrder: formData.sortOrder,
                // Also allow unsetting parentId if empty:
                ...(formData.parentId === '' ? { parentId: null } : {})
            };

            const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('Failed to update category:', {
                    categoryId,
                    status: response.status,
                    payload,
                    response: data,
                });
                setError(data.error || `Failed to update category (${response.status})`);
                setSaving(false);
                return;
            }

            // Broadcast data refresh event so list page refetches
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('admin:data-updated'));
            }

            // Wait briefly for cache to clear, then navigate
            await new Promise(resolve => setTimeout(resolve, 100));
            router.push('/admin/categories');
        } catch (err) {
            console.error('Error updating category:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while updating the category');
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading category...</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link
                    href="/admin/categories"
                    style={{ color: '#48bb78', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
                >
                    ← Back to Categories
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a202c', marginTop: '0.5rem' }}>
                    Edit Category
                </h1>
            </div>

            {error && (
                <div style={{ background: '#fed7d7', color: '#c53030', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Slug *</label>
                    <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Parent Category</label>
                    <select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}>
                        <option value="">None (Top-level category)</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id} disabled={c.id === parseInt(categoryId, 10)}>
                                {c.name} {c.id === parseInt(categoryId, 10) ? '(Current Category)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Sort Order</label>
                    <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Description</label>
                    <RichTextEditor
                        value={formData.description}
                        onChange={(description) => setFormData({ ...formData, description })}
                        placeholder="Category description (formatting supported)..."
                        minHeight={150}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#4a5568' }}>Category Image</label>
                    {formData.imageUrl && (
                        <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
                            <img src={formData.imageUrl} alt="Preview" style={{ maxWidth: 300, maxHeight: 200, borderRadius: 4, border: '1px solid #e2e8f0' }} />
                            <button type="button" onClick={() => { setFormData((p) => ({ ...p, imageUrl: '' })); setImageFile(null); }}
                                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ×
                            </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <label style={{
                            padding: '0.75rem 1.5rem', background: uploading ? '#cbd5e0' : '#48bb78',
                            color: 'white', borderRadius: 4, cursor: uploading ? 'wait' : 'pointer',
                            fontSize: '0.875rem', fontWeight: 500, display: 'inline-block', textAlign: 'center',
                        }}>
                            {uploading ? 'Uploading...' : 'Choose image (uploads immediately)'}
                            <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }}
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} />
                        </label>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <input type="url" value={formData.imageUrl}
                                onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
                                placeholder="Or enter image URL"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: '1rem', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" disabled={saving || uploading}
                        style={{ padding: '0.75rem 2rem', background: saving || uploading ? '#a0aec0' : '#48bb78', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '500', cursor: saving || uploading ? 'not-allowed' : 'pointer' }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <Link href="/admin/categories"
                        style={{ padding: '0.75rem 2rem', background: '#e2e8f0', color: '#4a5568', borderRadius: '4px', textDecoration: 'none', fontSize: '1rem', fontWeight: '500', display: 'inline-block' }}>
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
