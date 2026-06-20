'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface NewsletterCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
}

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

const emptyForm = { name: '', slug: '', description: '', color: '#6366f1', sort_order: 0 };

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function NewsletterCategoriesPage() {
  const [categories, setCategories] = useState<NewsletterCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/newsletter/categories', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCategories(data.data);
      else setError(data.error || 'Failed to load');
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(cat: NewsletterCategory) {
    setEditId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', color: cat.color, sort_order: cat.sort_order });
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
  }

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, slug: editId ? f.slug : slugify(name) }));
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Name and slug are required.');
      return;
    }
    setSaving(true);
    try {
      const url = editId
        ? `/api/admin/newsletter/categories/${editId}`
        : '/api/admin/newsletter/categories';
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.error || 'Save failed'); return; }
      cancelForm();
      await load();
    } catch {
      setFormError('Save request failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/newsletter/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error || 'Delete failed'); return; }
      await load();
    } catch {
      alert('Delete request failed');
    }
  }

  return (
    <AdminErrorBoundary>
      <div style={{ width: '100%', maxWidth: '100%', padding: 'clamp(1rem, 2vw, 2rem)', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Link href="/admin/newsletter" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                Newsletter
              </Link>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Categories</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Newsletter Categories
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0.25rem 0 0' }}>
              Define categories to label and organize newsletter content.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + New Category
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Inline form */}
        {showForm && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a', margin: '0 0 1.25rem' }}>
              {editId ? 'Edit Category' : 'New Category'}
            </h3>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Funding Rounds"
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Slug */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Slug <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="e.g. funding-rounds"
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>

              {/* Sort order */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional short description"
                rows={2}
                style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.9375rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Color */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0f172a' : '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.1s', outline: 'none', flexShrink: 0,
                    }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: '36px', height: '28px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '1px' }}
                  title="Custom color"
                />
                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>{form.color}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: saving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: 600, fontSize: '0.9375rem', cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px',
                  fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</p>
        ) : categories.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗂️</div>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>No categories yet</p>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Create categories like "Funding Rounds", "AI Tools", "Product Launches" to label newsletter content.
            </p>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 180px 120px 80px 100px', gap: '0', padding: '0.75rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>#</span>
              <span>Category</span>
              <span>Slug</span>
              <span>Color</span>
              <span>Order</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 180px 120px 80px 100px',
                  gap: '0', padding: '0.875rem 1.25rem', alignItems: 'center',
                  borderBottom: idx < categories.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{idx + 1}</span>

                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>{cat.name}</div>
                  {cat.description && (
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.15rem' }}>{cat.description}</div>
                  )}
                </div>

                <span style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.slug}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{cat.color}</span>
                </div>

                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{cat.sort_order}</span>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    style={{ padding: '0.375rem 0.75rem', background: '#ede9fe', color: '#6366f1', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    style={{ padding: '0.375rem 0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
