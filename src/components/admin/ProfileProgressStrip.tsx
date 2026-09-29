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
        // totalRequired/totalSubmitted (combined with the KYC checklist) are only present on the
        // employee surface — fall back to the plain generic-checklist count for Publisher/Event
        // Admin, which has no KYC section.
        if (json.data.totalRequired !== undefined) {
          if (json.data.totalRequired === 0) return;
          setTotal(json.data.totalRequired);
          setSubmitted(json.data.totalSubmitted ?? 0);
        } else {
          const documents = (json.data.documents || []) as { status: string }[];
          if (documents.length === 0) return;
          setTotal(documents.length);
          setSubmitted(documents.filter((d) => d.status === 'pending' || d.status === 'approved').length);
        }
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
    <Link
      href={documentsHref}
      className={`mb-4 flex items-center gap-3 rounded-[10px] border border-solid px-3.5 py-3 no-underline md:mb-6 md:gap-4 md:px-4 ${
        overdue ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50' : 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-[0.85rem] font-bold ${overdue ? 'text-red-700' : 'text-indigo-800'}`}>
          Complete your profile — {pct}%{daysLeft !== null && (overdue ? ' · window closed' : ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`)}
        </div>
        <div className={`text-xs ${overdue ? 'text-red-600' : 'text-indigo-500'}`}>{submitted} of {total} required documents submitted. Tap to finish.</div>
      </div>
      <div className={`h-2 w-16 shrink-0 overflow-hidden rounded-full sm:w-[90px] ${overdue ? 'bg-red-200' : 'bg-indigo-100'}`}>
        <div className={`h-full ${overdue ? 'bg-red-600' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
