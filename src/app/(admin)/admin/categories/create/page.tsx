'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, getAdminToken, withAdminToken } from '@/lib/admin-auth';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { getPresignedUploadUrl } from '@/app/actions/upload-image';

interface Category { id: number; name: string; slug?: string; }

export default function CreateCategoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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
        (async () => {
            try {
                const res = await fetch(withAdminToken('/api/admin/categories?limit=500'), { headers: getAuthHeaders() });
                const data = await res.json();
                if (data.success && data.data?.length) {
                    setCategories(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        })();
    }, []);

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
        setLoading(true);

        try {
            const parentId = formData.parentId ? parseInt(formData.parentId, 10) : undefined;
            const payload = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                imageUrl: formData.imageUrl,
                parentId: parentId,
                sortOrder: formData.sortOrder,
            };

            const response = await fetch(withAdminToken('/api/admin/categories'), {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const raw = await response.text();
            let data: { success?: boolean; error?: string } = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { error: raw?.slice(0, 200) || `Request failed with status ${response.status}` };
            }

            if (!response.ok || !data.success) {
                setError(data.error || `Failed to create category (${response.status})`);
                setLoading(false);
                return;
            }

            router.push('/admin/categories');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while creating the category');
            setLoading(false);
        }
    };

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
                    Create New Category
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
                    <input type="text" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} required
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
                            <option key={c.id} value={c.id}>{c.name}</option>
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
                    <button type="submit" disabled={loading || uploading}
                        style={{ padding: '0.75rem 2rem', background: loading || uploading ? '#a0aec0' : '#48bb78', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '500', cursor: loading || uploading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Creating...' : 'Create Category'}
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
