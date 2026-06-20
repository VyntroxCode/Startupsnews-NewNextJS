'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import Link from 'next/link';

interface Tool {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export default function ToolViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [tool, setTool] = useState<Tool | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/tools', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          const found = data.data.find((t: Tool) => String(t.id) === id);
          if (found) setTool(found);
          else setError('Tool not found');
        } else {
          setError('Failed to load');
        }
      } catch {
        setError('Failed to load tool');
      }
    };
    load();
  }, [id]);

  return (
    <AdminErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: '0.75rem' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <Link
            href="/admin/tools"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            HTML Tools
          </Link>
          <span style={{ color: '#cbd5e1' }}>›</span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{tool?.name ?? '…'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => window.open(`/api/admin/tools/${id}`, '_blank')}
              style={{ padding: '0.45rem 1rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
            >
              Open full screen ↗
            </button>
            <button
              onClick={() => router.push('/admin/tools')}
              style={{ padding: '0.45rem 1rem', background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
            >
              Manage tools
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.875rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Tool iframe */}
        {!error && (
          <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <iframe
              src={`/api/admin/tools/${id}`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title={tool?.name ?? 'HTML Tool'}
            />
          </div>
        )}
      </div>
    </AdminErrorBoundary>
  );
}
