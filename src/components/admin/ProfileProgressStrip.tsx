'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/admin-auth';

interface ProfileProgressStripProps {
  apiBase?: string;
  getHeaders?: () => HeadersInit;
  documentsHref?: string;
}

/** Slim, persistent "profile completion" strip fed by the same GET .../me endpoint as
 * DocumentsWidget — shown on every page of a surface (embedded in EmployeeLayout) or on the
 * dashboard (embedded conditionally on the Publisher/Event Admin home page), so profile
 * progress is visible without having to open the Documents page. Hides itself once complete
 * or when there's nothing to show (no linked Directory record, or no checklist configured). */
export default function ProfileProgressStrip({
  apiBase = '/api/admin/documents',
  getHeaders = getAuthHeaders,
  documentsHref = '/admin/documents',
}: ProfileProgressStripProps) {
  const [pct, setPct] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [submitted, setSubmitted] = useState(0);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/me`, { headers: getHeaders() });
        const json = await res.json();
        if (cancelled || !json.success || !json.data?.linked) return;
        const documents = (json.data.documents || []) as { status: string }[];
        if (documents.length === 0) return;
        const done = documents.filter((d) => d.status === 'pending' || d.status === 'approved').length;
        setTotal(documents.length);
        setSubmitted(done);
        setPct(json.data.progressPct ?? 0);
        setDaysLeft(json.data.daysLeft ?? null);
      } catch {
        // Silently skip — this is a passive strip, not worth surfacing an error banner for.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  if (pct === null || pct >= 100) return null;
  const overdue = daysLeft !== null && daysLeft < 0;

  return (
    <Link href={documentsHref} style={{
      display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none',
      background: overdue ? 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
      border: overdue ? '1px solid #fecaca' : '1px solid #e0e7ff',
      borderRadius: 10, padding: '0.75rem 1.1rem', marginBottom: '1.5rem',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: overdue ? '#b91c1c' : '#3730a3' }}>
          Complete your profile — {pct}%{daysLeft !== null && (overdue ? ' · window closed' : ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`)}
        </div>
        <div style={{ fontSize: '0.78rem', color: overdue ? '#dc2626' : '#6366f1' }}>{submitted} of {total} required documents submitted. Tap to finish.</div>
      </div>
      <div style={{ width: 90, height: 8, borderRadius: 999, background: overdue ? '#fecaca' : '#e0e7ff', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: overdue ? '#dc2626' : '#6366f1' }} />
      </div>
    </Link>
  );
}
