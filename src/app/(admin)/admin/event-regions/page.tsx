'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface EventRegion {
  id: number;
  name: string;
  sort_order: number;
}

export default function EventRegionsPage() {
  const [regions, setRegions] = useState<EventRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/event-regions', { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load regions');
      setRegions(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/admin/event-regions', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add region');
      setNewName('');
      await fetchRegions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add region');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (region: EventRegion) => {
    setEditingId(region.id);
    setEditName(region.name);
    setEditOrder(region.sort_order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/event-regions/${id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sort_order: editOrder }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update region');
      setEditingId(null);
      await fetchRegions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update region');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete region "${name}"? Events using this region will keep their current location text.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/event-regions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete region');
      await fetchRegions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete region');
    }
  };

  return (
    <AdminErrorBoundary>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/events" style={{ color: '#48bb78', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← Back to Events
            </Link>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
              Event Regions
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
              Manage the country/region list used in events. Changes appear immediately in the event create &amp; edit forms.
            </p>
          </div>
        </div>

        {/* Add form */}
        <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#0f172a', marginBottom: '1rem' }}>Add New Region</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Region name (e.g. Jordan, Canada...)"
              required
              style={{ flex: 1, minWidth: 220, padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', color: '#0f172a', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#48bb78'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                background: adding ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.9375rem',
                cursor: adding ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(72,187,120,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {adding ? 'Adding...' : 'Add Region'}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* Regions table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading regions...</div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                    {['#', 'Region Name', 'Sort Order', 'Actions'].map((h, i) => (
                      <th key={h} style={{
                        padding: '1.25rem 1.5rem',
                        textAlign: i === 3 ? 'right' : 'left',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regions.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        No regions found. Add one above.
                      </td>
                    </tr>
                  ) : regions.map((region, index) => (
                    <tr
                      key={region.id}
                      style={{ borderBottom: index < regions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.875rem', width: '48px' }}>{index + 1}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {editingId === region.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ padding: '0.5rem 0.75rem', border: '2px solid #48bb78', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: '100%', maxWidth: 280 }}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(region.id); if (e.key === 'Escape') cancelEdit(); }}
                          />
                        ) : (
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{region.name}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', width: '140px' }}>
                        {editingId === region.id ? (
                          <input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(Number(e.target.value))}
                            style={{ padding: '0.5rem 0.75rem', border: '2px solid #48bb78', borderRadius: '6px', fontSize: '0.9375rem', outline: 'none', width: 80 }}
                          />
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.9375rem' }}>{region.sort_order}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {editingId === region.id ? (
                            <>
                              <button
                                onClick={() => handleSave(region.id)}
                                disabled={saving}
                                style={{ padding: '0.4rem 0.875rem', background: saving ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{ padding: '0.4rem 0.875rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600' }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(region)}
                                style={{ padding: '0.4rem 0.875rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(245,158,11,0.2)', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(245,158,11,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(245,158,11,0.2)'; }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(region.id, region.name)}
                                style={{ padding: '0.4rem 0.875rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(239,68,68,0.2)', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)'; }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.04)', color: '#64748b', fontSize: '0.8125rem', background: '#f8fafc' }}>
              {regions.length} region{regions.length !== 1 ? 's' : ''} total
            </div>
          </div>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
