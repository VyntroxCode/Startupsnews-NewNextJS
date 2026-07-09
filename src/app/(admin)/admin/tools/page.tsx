'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface Tool {
  id: number;
  name: string;
  slug: string;
  visibleToEventAdmin?: boolean;
  visibleToPublisherAdmin?: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminToolsPage() {
  const isAdmin = getAdminUser()?.role === 'admin';
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toolName, setToolName] = useState('');
  const [visibleToEventAdmin, setVisibleToEventAdmin] = useState(false);
  const [visibleToPublisherAdmin, setVisibleToPublisherAdmin] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tools', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTools(data.data);
      else setError(data.error || 'Failed to load');
    } catch {
      setError('Failed to load tools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file: File, name: string) => {
    if (!name.trim()) { setError('Please enter a name for the tool'); return; }
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Only .html files are supported'); return;
    }
    setUploading(true); setError(''); setSuccess('');
    try {
      const html_content = await file.text();
      const res = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          html_content,
          visibleToEventAdmin,
          visibleToPublisherAdmin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`"${name}" uploaded successfully`);
        setToolName('');
        setVisibleToEventAdmin(false);
        setVisibleToPublisherAdmin(false);
        if (fileRef.current) fileRef.current.value = '';
        await load();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!toolName.trim()) setToolName(file.name.replace(/\.(html?)/i, '').replace(/[-_]+/g, ' '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select an HTML file'); return; }
    await uploadFile(file, toolName);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const name = toolName.trim() || file.name.replace(/\.(html?)/i, '').replace(/[-_]+/g, ' ');
    setToolName(name);
    uploadFile(file, name);
  };

  const handleDelete = async (tool: Tool) => {
    if (!confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/tools/${tool.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      setTools(prev => prev.filter(t => t.id !== tool.id));
      setSuccess(`"${tool.name}" deleted`);
    } catch {
      setError('Delete failed');
    }
  };

  const openTool = (tool: Tool) => {
    // Open via the API route which serves raw HTML with admin auth cookie
    window.open(`/api/admin/tools/${tool.id}`, '_blank');
  };

  return (
    <AdminErrorBoundary>
      <div>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.02em' }}>HTML Tools</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
            Upload any self-contained HTML tool — it will be saved to the database and accessible instantly from this page.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            ✓ {success}
          </div>
        )}

        {/* Upload form */}
        {isAdmin && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '1.25rem' }}>Upload a new tool</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Tool name</label>
              <input
                type="text"
                value={toolName}
                onChange={e => setToolName(e.target.value)}
                placeholder="e.g. Content Studio"
                style={{ width: '100%', maxWidth: '400px', padding: '0.625rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Also show to</label>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visibleToEventAdmin}
                    onChange={e => setVisibleToEventAdmin(e.target.checked)}
                  />
                  Event Admin
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visibleToPublisherAdmin}
                    onChange={e => setVisibleToPublisherAdmin(e.target.checked)}
                  />
                  Publisher Admin
                </label>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#6366f1' : '#cbd5e1'}`,
                borderRadius: '10px',
                padding: '2.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? '#f0f0ff' : '#f8fafc',
                transition: 'all 0.15s',
                maxWidth: '500px',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                {fileRef.current?.files?.[0]?.name || 'Click to select or drag & drop'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Accepts .html files only</div>
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: '0.75rem 1.75rem',
                  background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: 600, fontSize: '0.9375rem', cursor: uploading ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? 'Uploading…' : '↑ Upload Tool'}
              </button>
            </div>
          </form>
        </div>
        )}

        {/* Tools list */}
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a', marginBottom: '1rem' }}>
            Saved tools
            <span style={{ marginLeft: '0.5rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
              {tools.length}
            </span>
          </h3>

          {loading ? (
            <p style={{ color: '#64748b', padding: '2rem' }}>Loading…</p>
          ) : tools.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', fontWeight: 500 }}>No tools uploaded yet.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Upload your first HTML tool above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tools.map(tool => (
                <div key={tool.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #f0f0ff, #e0e7ff)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem' }}>
                    🛠️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '0.2rem' }}>{tool.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                      Uploaded {new Date(tool.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      &nbsp;·&nbsp; ID: {tool.id}
                    </div>
                    {isAdmin && (tool.visibleToEventAdmin || tool.visibleToPublisherAdmin) && (
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                        {tool.visibleToEventAdmin && (
                          <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600 }}>
                            Event Admin
                          </span>
                        )}
                        {tool.visibleToPublisherAdmin && (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600 }}>
                            Publisher Admin
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => openTool(tool)}
                      style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                    >
                      Open ↗
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(tool)}
                        style={{ padding: '0.5rem 0.875rem', background: 'white', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: '7px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminErrorBoundary>
  );
}
