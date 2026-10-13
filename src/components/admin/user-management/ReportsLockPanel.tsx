'use client';

import { useEffect, useState } from 'react';
import { Check, Lock, LockOpen } from 'lucide-react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { MAX_LOCK_START_PAGE, type FreePages } from '@/modules/reports/domain/lock';

const API = '/api/admin/user-management/reports-lock';

const cardCls = 'rounded-xl border border-solid border-slate-200 bg-white';
const btnPrimary = 'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const selectCls = 'box-border h-10 w-full max-w-xs cursor-pointer rounded-lg border border-solid border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none';

/** <select> value ↔ FreePages: 'none' = no lock, otherwise the page the lock starts from. */
const toOption = (freePages: FreePages) => (freePages === null ? 'none' : String(freePages + 1));
const fromOption = (option: string): FreePages => (option === 'none' ? null : Number(option) - 1);

/** What readers get for a given choice, in plain words. */
function summary(freePages: FreePages, pageSize: number): { open: string; locked: string } {
  if (freePages === null) return { open: 'Every page of every report section.', locked: 'Nothing is locked.' };
  if (freePages === 0) return { open: 'Nothing. Readers can see the report cards but cannot open any report.', locked: 'Every page, starting from page 1.' };
  return {
    open: `${freePages === 1 ? 'Page 1' : `Pages 1 to ${freePages}`} of each section (the newest ${freePages * pageSize} reports).`,
    locked: `Page ${freePages + 1} onwards. Cards are greyed and show the “Pro Plan Needed” message.`,
  };
}

/** /admin/user-management › Reports section — where the Pro plan lock starts on the reader Reports
 * page. One setting for every report section. */
export default function ReportsLockPanel() {
  const [saved, setSaved] = useState<FreePages | undefined>(undefined);
  const [option, setOption] = useState('none');
  const [pageSize, setPageSize] = useState(12);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch(API, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.success) throw new Error(json?.error || 'Failed to load the setting.');
        setSaved(json.data.freePages);
        setOption(toOption(json.data.freePages));
        setPageSize(json.data.pageSize);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the setting.'));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ freePages: fromOption(option) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to save the setting.');
      setSaved(json.data.freePages);
      setNotice('Saved. Readers see the change the next time they open Reports.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the setting.');
    } finally {
      setSaving(false);
    }
  };

  const loaded = saved !== undefined;
  const choice = fromOption(option);
  const text = summary(choice, pageSize);
  const dirty = loaded && choice !== saved;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      {error && <p role="alert" className="m-0 rounded-lg border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && (
        <p role="status" className="m-0 flex items-center gap-2 rounded-lg border border-solid border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check size={16} aria-hidden className="shrink-0" /> {notice}
        </p>
      )}

      <div className={cardCls}>
        <div className="border-0 border-b border-solid border-slate-200 px-5 py-4">
          <h2 className="m-0 text-base font-bold text-slate-900">Reports Pro plan lock</h2>
          <p className="m-0 mt-0.5 text-xs leading-relaxed text-slate-500">
            Choose the page where the lock starts on the readers&apos; Reports page. Pages before it stay open to everyone. The same setting applies to every report section, {pageSize} reports to a page.
          </p>
        </div>

        {!loaded ? (
          <p className="m-0 px-5 py-12 text-center text-sm text-slate-500">{error ? 'The setting could not be loaded.' : 'Loading setting…'}</p>
        ) : (
          <>
            <div className="grid gap-x-8 gap-y-6 px-5 py-5 lg:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="rl-start" className="mb-1.5 block text-sm font-medium text-slate-700">Lock starts from</label>
                <select id="rl-start" className={selectCls} value={option} onChange={(e) => { setOption(e.target.value); setNotice(''); }}>
                  <option value="none">No lock (all pages open)</option>
                  {Array.from({ length: MAX_LOCK_START_PAGE }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>{p === 1 ? 'Page 1 (everything locked)' : `Page ${p}`}</option>
                  ))}
                </select>
                <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-500">
                  The lock applies to every reader for now, because there are no Pro members yet.
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-start gap-3 rounded-lg border border-solid border-emerald-200 bg-emerald-50 px-4 py-3">
                  <LockOpen size={18} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Open to readers</div>
                    <p className="m-0 mt-0.5 text-sm leading-relaxed text-slate-700">{text.open}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-solid border-slate-200 bg-slate-50 px-4 py-3">
                  <Lock size={18} aria-hidden className="mt-0.5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Locked (Pro plan)</div>
                    <p className="m-0 mt-0.5 text-sm leading-relaxed text-slate-700">{text.locked}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-0 border-t border-solid border-slate-200 px-5 py-4">
              {dirty && <span className="text-xs text-slate-500">You have an unsaved change.</span>}
              <button type="button" onClick={save} disabled={!dirty || saving} className={btnPrimary}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
