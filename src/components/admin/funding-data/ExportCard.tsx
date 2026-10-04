'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { downloadWithHeaders } from '@/modules/funding-deals/utils/download';
import { btnPrimary, btnSecondary, cardCls } from './ui';

/** The preview's "Download" card on Bulk Upload: the whole dataset, or this calendar year. */
export default function ExportCard() {
  const [busy, setBusy] = useState<'all' | 'year' | null>(null);
  const run = async (kind: 'all' | 'year') => {
    setBusy(kind);
    const y = new Date().getFullYear();
    const qs = kind === 'year' ? `?from=${y}-01-01&to=${y}-12-31` : '';
    const err = await downloadWithHeaders(`/api/admin/funding-deals/export${qs}`, getAuthHeaders(), 'funding-deals.xlsx');
    setBusy(null);
    if (err) window.alert(err);
  };
  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="m-0 text-base font-bold text-slate-900">Download</h2>
      <p className="m-0 mb-4 mt-1 text-sm text-slate-500">Export the full dataset or this year&apos;s deals. For any other slice, use Manage Records → Export filtered.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} onClick={() => run('all')} disabled={busy !== null}>
          {busy === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export all (.xlsx)
        </button>
        <button type="button" className={btnPrimary} onClick={() => run('year')} disabled={busy !== null}>
          {busy === 'year' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export this year (.xlsx)
        </button>
      </div>
    </div>
  );
}
