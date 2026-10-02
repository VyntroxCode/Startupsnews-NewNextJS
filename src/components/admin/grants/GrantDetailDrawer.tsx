'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, FileText, Mail, Phone, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getAuthHeaders } from '@/lib/admin-auth';
import { formatIndianCurrency } from '@/lib/format/indian-number';
import {
  DOSSIER_STATUSES,
  type DossierDetail,
  type DossierListItem,
  type DossierStatus,
} from '@/modules/incubatx-dossier/domain/types';
import { GRANT_STATUS_META, formatSubmitted } from './constants';

const NOT_PROVIDED = <span className="text-slate-400">Not provided</span>;

function href(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ExtLink({ url }: { url: string }) {
  return (
    <a href={href(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-indigo-600 no-underline hover:text-indigo-800">
      {url} <ExternalLink size={12} aria-hidden className="shrink-0" />
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h3 className="m-0 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">{title}</h3>
      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-[180px_1fr]">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:pt-0.5">{label}</dt>
      <dd className="m-0 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function Long({ text }: { text: string }) {
  return text ? <span className="whitespace-pre-line">{text}</span> : NOT_PROVIDED;
}

/** The Grants detail window: a slide-over from the right (full width on phones) showing every
 * answer from the IncubatX dossier, grouped the way the public form's steps group them, with the
 * uploaded documents as open links and a status picker at the top. */
export default function GrantDetailDrawer({ item, onClose, onStatusChanged }: {
  item: DossierListItem;
  onClose: () => void;
  onStatusChanged: (detail: DossierDetail) => void;
}) {
  const [detail, setDetail] = useState<DossierDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEscapeKey(onClose);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/grants/${item.id}`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load the submission');
        if (!cancelled) setDetail(json.data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load the submission');
      }
    })();
    return () => { cancelled = true; };
  }, [item.id]);

  async function changeStatus(status: DossierStatus) {
    if (!detail || status === detail.status) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/admin/grants/${item.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't update the status");
      setDetail(json.data);
      onStatusChanged(json.data);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't update the status");
    } finally {
      setSaving(false);
    }
  }

  const d = detail;
  const status = d?.status ?? item.status;
  const meta = GRANT_STATUS_META[status];

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="grant-drawer-title">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {item.reference && (
                  <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">{item.reference}</span>
                )}
                <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>{meta.label}</span>
              </div>
              <h2 id="grant-drawer-title" className="m-0 mt-2 break-words text-xl font-bold text-slate-900">{item.startupName}</h2>
              <p className="m-0 mt-1 text-xs text-slate-500">
                {item.stage} · {item.sector} · Submitted {formatSubmitted(item.submittedAt, true)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.mobile && (
              <a href={`tel:${item.mobile.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-indigo-300 hover:text-indigo-700">
                <Phone size={14} aria-hidden /> Call
              </a>
            )}
            {item.email && (
              <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-indigo-300 hover:text-indigo-700">
                <Mail size={14} aria-hidden /> Email
              </a>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-slate-600">
              Status
              <select
                value={status}
                disabled={!d || saving}
                onChange={(e) => void changeStatus(e.target.value as DossierStatus)}
                className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {DOSSIER_STATUSES.map((s) => <option key={s} value={s}>{GRANT_STATUS_META[s].label}</option>)}
              </select>
            </label>
          </div>
          {saveError && <p role="alert" className="m-0 mt-2 text-right text-sm text-red-700">{saveError}</p>}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!d && !loadError && <p className="py-10 text-center text-sm text-slate-500">Loading the submission…</p>}
          {loadError && <p className="py-10 text-center text-sm text-red-700">{loadError}</p>}

          {d && (
            <div className="flex flex-col gap-4">
              <Section title="Startup & founders">
                <Row label="Startup name">{d.startupName}</Row>
                <Row label="Website">{d.websiteUrl ? <ExtLink url={d.websiteUrl} /> : NOT_PROVIDED}</Row>
                <Row label="Email">
                  <a href={`mailto:${d.email}`} className="break-all text-indigo-600 no-underline hover:text-indigo-800">{d.email}</a>
                </Row>
                <Row label="Mobile">
                  {d.mobile ? <a href={`tel:${d.mobile.replace(/\s+/g, '')}`} className="text-indigo-600 no-underline hover:text-indigo-800">{d.mobile}</a> : NOT_PROVIDED}
                </Row>
                <Row label="Founders">
                  {d.founders.length ? (
                    <ul className="m-0 list-disc pl-4 leading-6">{d.founders.map((f) => <li key={f}>{f}</li>)}</ul>
                  ) : NOT_PROVIDED}
                </Row>
              </Section>

              <Section title="Positioning">
                <Row label="Stage">{d.stage}</Row>
                <Row label="Sector">{d.sector}</Row>
                <Row label="LinkedIn">
                  {d.linkedin.length ? (
                    <ul className="m-0 list-none p-0 leading-6">{d.linkedin.map((l) => <li key={l}><ExtLink url={l} /></li>)}</ul>
                  ) : NOT_PROVIDED}
                </Row>
                <Row label="Description"><Long text={d.description} /></Row>
              </Section>

              <Section title="Market & model">
                <Row label="Market opportunity"><Long text={d.marketOpportunity} /></Row>
                <Row label="Business model"><Long text={d.businessModel} /></Row>
                <Row label="Monthly revenue">{formatIndianCurrency(d.monthlyRevenue)}</Row>
                <Row label="Annual revenue">{formatIndianCurrency(d.annualRevenue)}</Row>
                <Row label="Customers / users">{d.customerCount.toLocaleString('en-IN')}</Row>
              </Section>

              <Section title="Financials & team">
                <Row label="Revenue (last FY)">{formatIndianCurrency(d.revenueLastFy)}</Row>
                <Row label="Raised funding">
                  {d.hasRaised ? `Yes — ${formatIndianCurrency(d.totalFundingRaised ?? 0)}` : 'No'}
                </Row>
                <Row label="Team">{d.fullTimeCount} full-time · {d.partTimeCount} part-time</Row>
              </Section>

              <section className="rounded-xl border border-slate-200 bg-white">
                <h3 className="m-0 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">Documents</h3>
                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                  {d.documents.map((doc) => (
                    <li key={doc.label} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${doc.url ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                          <FileText size={18} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{doc.label}</div>
                          <div className="truncate text-xs text-slate-500" title={doc.filename || undefined}>{doc.filename || 'Not uploaded'}</div>
                        </div>
                      </div>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 no-underline hover:border-indigo-300 hover:text-indigo-700">
                          Open <ExternalLink size={13} aria-hidden />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
