'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Database, History, Loader2, PencilLine, Table2, Upload } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { FundingDealInput } from '@/modules/funding-deals/domain/types';
import { formatUsdMn, isNumberSystem, NUMBER_SYSTEM_OPTIONS, setNumberSystem, type NumberSystem } from '@/modules/funding-deals/utils/format';
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
  // Saved number system — every amount on this page and the reader Funding pages follows it.
  const [numberSystem, setNumberSystemState] = useState<NumberSystem | null>(null);
  const [savingSystem, setSavingSystem] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  // Applied during render so the forms/tables below format with it on this same pass.
  if (numberSystem) setNumberSystem(numberSystem);

  useEffect(() => {
    fetch('/api/admin/funding-deals/settings', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((json) => setNumberSystemState(json.success && isNumberSystem(json.data.numberSystem) ? json.data.numberSystem : 'international'))
      .catch(() => setNumberSystemState('international'));
  }, []);

  const changeNumberSystem = async (next: NumberSystem) => {
    if (next === numberSystem || savingSystem) return;
    setSavingSystem(true);
    setSystemError(null);
    const res = await fetch('/api/admin/funding-deals/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ numberSystem: next }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({ success: false })) : { success: false };
    setSavingSystem(false);
    if (json.success) setNumberSystemState(next);
    else setSystemError(json.error || 'Could not save the number system.');
  };

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
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Number system {savingSystem && <Loader2 size={12} className="animate-spin" />}
          </span>
          <div role="radiogroup" aria-label="Number system" className="flex rounded-lg border border-solid border-slate-200 bg-slate-50 p-1">
            {NUMBER_SYSTEM_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={numberSystem === o.value}
                disabled={!numberSystem || savingSystem}
                onClick={() => changeNumberSystem(o.value)}
                className={`flex cursor-pointer flex-col items-start rounded-md border-0 px-3 py-1.5 text-left disabled:cursor-default ${numberSystem === o.value ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <span className="text-sm font-semibold">{o.label}</span>
                <span className="text-[11px]">{o.units}</span>
              </button>
            ))}
          </div>
          {systemError && <span className="text-xs text-red-600">{systemError}</span>}
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
          <p className="m-0 mb-4 mt-1 text-sm text-slate-500">Fields marked * are required. Type the round size as a number and pick its unit — the units follow the number system above.</p>
          {notice && <p className="m-0 mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
          {numberSystem && <DealForm key={numberSystem} submitLabel="Save deal" onSubmit={createDeal} resetOnSuccess />}
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
