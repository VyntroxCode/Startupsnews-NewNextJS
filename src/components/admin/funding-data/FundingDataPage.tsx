'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Database, History, PencilLine, Table2, Upload } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { FundingDealInput } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import AiSourcesPanel from './AiSourcesPanel';
import BulkUpload from './BulkUpload';
import ExportCard from './ExportCard';
import DealForm from './DealForm';
import RecordsTable from './RecordsTable';
import UploadHistory from './UploadHistory';
import { cardCls } from './ui';

type Tab = 'entry' | 'upload' | 'records' | 'history' | 'sources';

const TABS: { key: Tab; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Bulk Upload', icon: Upload },
  { key: 'entry', label: 'Manual Entry', icon: PencilLine },
  { key: 'records', label: 'Manage Records', icon: Table2 },
  { key: 'history', label: 'Upload History', icon: History },
  { key: 'sources', label: 'AI Data Sources', icon: Database },
];

/**
 * /admin/funding-data — the funding-round dataset shown to readers on /dashboard/funding.
 * Financial Analyst + super admin (FUNDING_ROLES). `?tab=` picks the opening tab (dashboard cards link here).
 */
export default function FundingDataPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.key === t) ? (t as Tab) : 'upload';
  });
  // Bumped after any write so the records table, history and header numbers reload.
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<{ total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/funding-deals?limit=1', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((json) => setSummary(json.success ? { total: json.pagination.total } : null))
      .catch(() => setSummary(null));
  }, [refreshKey]);

  const changed = () => setRefreshKey((k) => k + 1);

  const switchTab = (next: Tab) => {
    setTab(next);
    setNotice(null);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  };

  const createDeal = async (values: Required<FundingDealInput>): Promise<string | null> => {
    const res = await fetch('/api/admin/funding-deals', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({ success: false }));
    if (!json.success) return json.error || 'Save failed.';
    setNotice(`Saved ${json.data.startupName} — ${json.data.roundStage || 'round'}, ${formatUsdMn(json.data.amount)}.`);
    changed();
    return null;
  };

  return (
    <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">Funding Data</h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Funding rounds shown to logged-in readers on their dashboard&apos;s Funding page.
            {summary && <> · <b className="font-semibold text-slate-700">{summary.total.toLocaleString()}</b> deals in the dataset</>}
          </p>
        </div>
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-solid border-slate-200 bg-slate-50 p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-0 px-4 text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'entry' && (
        <div className={`${cardCls} max-w-3xl p-5`}>
          <h2 className="m-0 text-base font-bold text-slate-900">Add a deal</h2>
          <p className="m-0 mb-4 mt-1 text-sm text-slate-500">Fields marked * are required. Round size is converted to USD millions on save.</p>
          {notice && <p className="m-0 mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
          <DealForm submitLabel="Save deal" onSubmit={createDeal} resetOnSuccess />
        </div>
      )}
      {tab === 'upload' && (
        <div className="flex flex-col gap-5">
          <BulkUpload onImported={changed} />
          <ExportCard />
        </div>
      )}
      {tab === 'records' && <RecordsTable refreshKey={refreshKey} onChanged={changed} />}
      {tab === 'history' && <UploadHistory refreshKey={refreshKey} onChanged={changed} />}
      {tab === 'sources' && <AiSourcesPanel />}
    </div>
  );
}
