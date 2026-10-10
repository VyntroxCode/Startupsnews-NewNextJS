'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, EyeOff, LayoutGrid, Megaphone, Pencil, Plus, Trash2, X, type LucideIcon } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import { getAuthHeaders } from '@/lib/admin-auth';
import {
  MAX_ACTIVE_SPONSOR_CARDS,
  MAX_SPONSOR_CARDS,
  SUBTITLE_MAX_WORDS,
  TITLE_MAX_WORDS,
  countWords,
  validateSponsorCardInput,
  type SponsorCard,
  type SponsorCardInput,
} from '@/modules/funding-sponsor-cards/domain/types';

const API = '/api/admin/user-management/funding-cards';

interface FormState {
  /** null = a new card. */
  id: number | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

const inputCls = 'box-border h-10 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none';
const labelCls = 'mb-1.5 flex items-center justify-between gap-3 text-sm font-medium text-slate-700';
const hintCls = 'm-0 mt-1.5 text-xs leading-relaxed text-slate-500';
const legendCls = 'mb-3 block p-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const cardCls = 'rounded-xl border border-solid border-slate-200 bg-white';
const btnPrimary = 'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const btnSecondary = 'inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-solid border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50';
const thCls = 'whitespace-nowrap border-0 px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const tdCls = 'border-0 border-t border-solid border-slate-200 px-5 py-4 align-middle';

async function send(url: string, method: string, body?: SponsorCardInput) {
  const res = await fetch(url, {
    method,
    headers: { ...getAuthHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Something went wrong. Please try again.');
  return json;
}

function WordCount({ text, max }: { text: string; max: number }) {
  const n = countWords(text);
  return <span className={`text-xs font-normal ${n > max ? 'text-red-600' : 'text-slate-400'}`}>{n} / {max} words</span>;
}

function StatTile({ icon: Icon, label, value, of }: { icon: LucideIcon; label: string; value: number; of?: number }) {
  return (
    <div className={`${cardCls} flex items-center gap-3 px-4 py-3.5`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5 text-xl font-bold leading-tight text-slate-900">
          {value}
          {of !== undefined && <span className="text-sm font-medium text-slate-400"> of {of}</span>}
        </div>
      </div>
    </div>
  );
}

/** The card as a reader sees it on /dashboard/funding. */
function CardPreview({ title, subtitle, imageUrl }: { title: string; subtitle: string; imageUrl: string | null }) {
  return (
    <div className="relative box-border flex w-full min-w-0 items-center gap-3 rounded-xl border border-solid border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <span className="absolute right-[9px] top-1.5 text-[8.5px] font-bold uppercase tracking-[0.04em] text-slate-400">Sponsored</span>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-[46px] w-[46px] shrink-0 rounded-[10px] border border-solid border-slate-200 bg-white object-contain" />
      ) : (
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white">
          <Megaphone size={20} aria-hidden />
        </span>
      )}
      <span className="block min-w-0 pr-14">
        <span className="block text-[12.5px] font-bold leading-snug text-slate-900">{title || 'Title'}</span>
        {subtitle && <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{subtitle}</span>}
      </span>
    </div>
  );
}

/** /admin/user-management — the sponsor cards at the top of the reader Funding Dashboard.
 * Up to 5 cards can be kept here; up to 3 of them are switched on to show. */
export default function FundingCardsPage() {
  const [cards, setCards] = useState<SponsorCard[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formOpen = form !== null;

  // Edit is clicked down in the table; bring the form (rendered above it) into view.
  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [formOpen, form?.id]);

  const load = useCallback(async () => {
    try {
      const json = await send(API, 'GET');
      setCards(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the cards.');
      setCards((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = cards?.length ?? 0;
  const showing = cards?.filter((c) => c.isActive).length ?? 0;
  const canAdd = !!cards && total < MAX_SPONSOR_CARDS;

  const openNew = () => {
    setFormError('');
    setForm({ id: null, title: '', subtitle: '', imageUrl: '', linkUrl: '', isActive: showing < MAX_ACTIVE_SPONSOR_CARDS });
  };

  const openEdit = (c: SponsorCard) => {
    setFormError('');
    setForm({ id: c.id, title: c.title, subtitle: c.subtitle, imageUrl: c.imageUrl || '', linkUrl: c.linkUrl, isActive: c.isActive });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const parsed = validateSponsorCardInput(form);
    if ('error' in parsed) { setFormError(parsed.error); return; }
    setSaving(true);
    setFormError('');
    try {
      await send(form.id ? `${API}/${form.id}` : API, form.id ? 'PUT' : 'POST', parsed.input);
      setForm(null);
      setError('');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save the card.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: SponsorCard) => {
    setBusyId(c.id);
    setError('');
    try {
      await send(`${API}/${c.id}`, 'PUT', { title: c.title, subtitle: c.subtitle, imageUrl: c.imageUrl, linkUrl: c.linkUrl, isActive: !c.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the card.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: SponsorCard) => {
    if (!window.confirm(`Delete “${c.title}”? This cannot be undone.`)) return;
    setBusyId(c.id);
    setError('');
    try {
      await send(`${API}/${c.id}`, 'DELETE');
      if (form?.id === c.id) setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete the card.');
    } finally {
      setBusyId(null);
    }
  };

  // Slots left for the card in the form: its own current "on" state doesn't count against it.
  const otherShowing = cards?.filter((c) => c.isActive && c.id !== form?.id).length ?? 0;
  const formCanShow = otherShowing < MAX_ACTIVE_SPONSOR_CARDS;

  return (
    // No max-width: the admin shell's content area widens when the sidebar closes, and this page
    // fills whatever it is given.
    <div className="box-border flex w-full min-w-0 flex-col gap-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold leading-tight text-slate-900">User Management</h1>
          <p className="m-0 mt-1 text-sm leading-relaxed text-slate-500">Settings for what readers see in the user panel.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          disabled={!canAdd}
          title={canAdd ? undefined : `You can have at most ${MAX_SPONSOR_CARDS} cards. Delete one to add another.`}
          className={btnPrimary}
        >
          <Plus size={16} aria-hidden /> Add card
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={LayoutGrid} label="Cards created" value={total} of={MAX_SPONSOR_CARDS} />
        <StatTile icon={Eye} label="Showing to readers" value={showing} of={MAX_ACTIVE_SPONSOR_CARDS} />
        <StatTile icon={EyeOff} label="Hidden" value={total - showing} />
      </div>

      {error && <p role="alert" className="m-0 rounded-lg border border-solid border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {form && (
        <form ref={formRef} onSubmit={save} className={`${cardCls} scroll-mt-20`}>
          <div className="flex items-center justify-between gap-3 border-0 border-b border-solid border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 className="m-0 text-base font-bold text-slate-900">{form.id ? 'Edit card' : 'New card'}</h2>
              <p className="m-0 mt-0.5 text-xs text-slate-500">Fields marked <span className="text-red-500">*</span> are required.</p>
            </div>
            <button type="button" onClick={() => setForm(null)} aria-label="Close" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="grid gap-x-8 gap-y-6 px-5 py-5 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px]">
            <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
              <legend className={legendCls}>Text and link</legend>
              <div>
                <label htmlFor="fc-title" className={labelCls}>
                  <span>Title <span className="text-red-500">*</span></span>
                  <WordCount text={form.title} max={TITLE_MAX_WORDS} />
                </label>
                <input id="fc-title" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bank with Acme Startup Banking" />
              </div>
              <div>
                <label htmlFor="fc-subtitle" className={labelCls}>
                  <span>Sub title</span>
                  <WordCount text={form.subtitle} max={SUBTITLE_MAX_WORDS} />
                </label>
                <textarea id="fc-subtitle" rows={2} className={`${inputCls} h-auto resize-y py-2 leading-snug`} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="One short line under the title" />
              </div>
              <div>
                <label htmlFor="fc-link" className={labelCls}><span>Link <span className="text-red-500">*</span></span></label>
                <input id="fc-link" type="url" className={inputCls} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://example.com" />
                <p className={hintCls}>Clicking the card opens this address in a new tab.</p>
              </div>
            </fieldset>

            <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
              <legend className={legendCls}>Image or logo</legend>
              {/* text-sm so the shared uploader's own label matches the other field labels. */}
              <div className="text-sm">
                {/* Keyed on the URL so the uploader's own preview follows a pasted address too. */}
                <ImageUpload key={form.imageUrl} label="Upload a file" value={form.imageUrl} onChange={(url) => setForm((f) => (f ? { ...f, imageUrl: url } : f))} />
              </div>
              <label htmlFor="fc-image-url" className={labelCls}><span>Or paste an image address</span></label>
              <input id="fc-image-url" type="url" className={inputCls} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/logo.png" />
              <p className={hintCls}>Square logos look best. Leave empty to show the megaphone icon.</p>
            </fieldset>

            <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
              <div className={legendCls}>Preview</div>
              <div className="box-border rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="max-w-[380px]">
                  <CardPreview title={form.title.trim()} subtitle={form.subtitle.trim()} imageUrl={form.imageUrl.trim() || null} />
                </div>
              </div>
              <p className={hintCls}>This is how the card looks on the Funding page.</p>
            </div>
          </div>
          {formError && <p role="alert" className="m-0 mx-5 mb-4 rounded-lg border border-solid border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-0 border-t border-solid border-slate-200 bg-slate-50 px-5 py-4">
            <label className={`flex min-w-0 items-center gap-2.5 text-sm font-medium ${formCanShow ? 'cursor-pointer text-slate-700' : 'text-slate-400'}`}>
              <input
                type="checkbox"
                className="m-0 h-4 w-4 shrink-0 accent-indigo-600"
                checked={form.isActive && formCanShow}
                disabled={!formCanShow}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>
                Show this card on the Funding page
                {!formCanShow && <span className="font-normal"> ({MAX_ACTIVE_SPONSOR_CARDS} cards are already showing. Switch one off first.)</span>}
              </span>
            </label>
            <div className="ml-auto flex shrink-0 gap-2">
              <button type="button" onClick={() => setForm(null)} className={btnSecondary}>Cancel</button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create card'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className={`${cardCls} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-0 border-b border-solid border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-base font-bold text-slate-900">Funding sponsor cards</h2>
            <p className="m-0 mt-0.5 text-xs leading-relaxed text-slate-500">
              Shown at the top of the Funding Dashboard. Keep up to {MAX_SPONSOR_CARDS} here and switch on up to {MAX_ACTIVE_SPONSOR_CARDS}. Hidden cards are not shown to readers.
            </p>
          </div>
          {!!cards && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{total} {total === 1 ? 'card' : 'cards'}</span>}
        </div>
        {!cards ? (
          <p className="m-0 px-5 py-12 text-center text-sm text-slate-500">Loading cards…</p>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Megaphone size={22} aria-hidden /></span>
            <p className="m-0 mt-3 text-sm font-semibold text-slate-800">No cards yet</p>
            <p className="m-0 mt-1 max-w-sm text-sm leading-relaxed text-slate-500">Until a card is added and switched on, the Funding page shows no sponsor row.</p>
            <button type="button" onClick={openNew} className={`${btnPrimary} mt-4`}><Plus size={16} aria-hidden /> Add card</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className={thCls}>Card</th>
                  <th scope="col" className={thCls}>Link</th>
                  <th scope="col" className={thCls}>Status</th>
                  <th scope="col" className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => {
                  const blocked = !c.isActive && showing >= MAX_ACTIVE_SPONSOR_CARDS;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className={tdCls}>
                        {/* Same width as a card in the reader's three-column row, so the preview is true to size. */}
                        <div className="w-[380px]">
                          <CardPreview title={c.title} subtitle={c.subtitle} imageUrl={c.imageUrl} />
                        </div>
                      </td>
                      {/* w-full + max-w-0: this column takes the spare width and truncates inside it. */}
                      <td className={`${tdCls} w-full max-w-0`}>
                        <a href={c.linkUrl} target="_blank" rel="noopener noreferrer" title={c.linkUrl} className="flex min-w-0 items-center gap-1.5 text-sm text-indigo-600 no-underline hover:underline">
                          <ExternalLink size={14} aria-hidden className="shrink-0" /> <span className="truncate">{c.linkUrl}</span>
                        </a>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={c.isActive}
                            aria-label={`Show “${c.title}” on the Funding page`}
                            title={blocked ? `${MAX_ACTIVE_SPONSOR_CARDS} cards are already showing. Switch one off first.` : undefined}
                            disabled={blocked || busyId === c.id}
                            onClick={() => toggle(c)}
                            className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${c.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-[left] ${c.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                          <span className={`inline-block w-[68px] rounded-full py-0.5 text-center text-xs font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.isActive ? 'Showing' : 'Hidden'}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => openEdit(c)} aria-label={`Edit “${c.title}”`} title="Edit" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-600 hover:bg-slate-100">
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button type="button" onClick={() => remove(c)} disabled={busyId === c.id} aria-label={`Delete “${c.title}”`} title="Delete" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-solid border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
