'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, Undo2 } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import type { FundingUploadBatch } from '@/modules/funding-deals/domain/types';
import { cardCls } from './ui';

function formatWhen(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value || '');
  if (!m) return value || '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = Number(m[4]);
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}, ${h % 12 || 12}:${m[5]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Admin › Funding Data › Upload History — every Excel/CSV import, with Undo (removes its deals). */
export default function UploadHistory({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [batches, setBatches] = useState<FundingUploadBatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/funding-deals/batches', { headers: getAuthHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBatches(json.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Failed to load upload history.');
      setBatches([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const undo = async (b: FundingUploadBatch) => {
    if (!window.confirm(`Undo “${b.fileName}”? This removes the ${b.dealsRemaining.toLocaleString()} deals it added that are still in the dataset, including any edits made to them since.`)) return;
    setUndoing(b.id);
    const res = await fetch(`/api/admin/funding-deals/batches/${b.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    const json = await res.json().catch(() => ({ success: false }));
    setUndoing(null);
    if (!json.success) { window.alert(json.error || 'Undo failed.'); return; }
    onChanged();
    void load();
  };

  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="border-0 border-b border-solid border-slate-200 px-5 py-4">
        <h2 className="m-0 text-base font-bold text-slate-900">Upload history</h2>
        <p className="m-0 mt-0.5 text-xs text-slate-500">Undo removes everything a file added. Manually added deals are never affected.</p>
      </div>
      {error && <p className="m-0 px-5 py-3 text-sm text-red-700">{error}</p>}
      {!batches ? (
        <p className="m-0 px-5 py-10 text-center text-sm text-slate-500">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="m-0 px-5 py-10 text-center text-sm text-slate-500">No uploads yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Uploaded</th>
                <th className="px-4 py-3 text-right font-semibold">Rows</th>
                <th className="px-4 py-3 text-right font-semibold">Added</th>
                <th className="px-4 py-3 text-right font-semibold">Duplicates</th>
                <th className="px-4 py-3 text-right font-semibold">Rejected</th>
                <th className="px-4 py-3 text-right font-semibold">Still live</th>
                <th className="px-4 py-3"><span className="sr-only">Undo</span></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-0 border-t border-solid border-slate-100 align-middle">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <FileSpreadsheet size={16} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{b.fileName}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">Upload #{b.id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="block whitespace-nowrap">{formatWhen(b.createdAt)}</span>
                    <span className="block text-xs text-slate-500">{b.uploadedBy || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{b.rowsTotal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-emerald-700">{b.rowsInserted.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{b.rowsSkipped.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-amber-700">{b.rowsInvalid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{b.dealsRemaining.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-solid border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={undoing === b.id || b.dealsRemaining === 0}
                      onClick={() => void undo(b)}
                    >
                      {undoing === b.id ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                      Undo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
