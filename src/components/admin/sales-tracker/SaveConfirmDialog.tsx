'use client';

import { PencilLine, TriangleAlert } from 'lucide-react';

/** "Save these changes?" warning shown by the Sales Tracker lead windows (LeadFormModal,
 * EnsEnquiryDetailModal) before an edit to an existing lead is written. The windows open straight
 * into an editable form, so this is the one deliberate step between a change and the database.
 * Render it as a sibling of the lead window's own overlay (not inside it) — that overlay scrolls
 * and has a backdrop-filter, which would trap a fixed child. Frame and buttons are the page's
 * shared .modal-* styles; the content inside is Tailwind. */
export default function SaveConfirmDialog({ changes, saving, onCancel, onConfirm }: {
  /** Labels of the fields that differ from what's stored, in form order. */
  changes: string[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay open" style={{ zIndex: 1001, alignItems: 'center' }} onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}>
      <div className="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="st-save-confirm-title" aria-describedby="st-save-confirm-desc" style={{ width: '100%', maxWidth: 460 }}>
        <div className="modal-head">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <TriangleAlert size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="st-save-confirm-title">Save changes to this lead?</h2>
              <p id="st-save-confirm-desc" className="m-0 mt-1 text-[13px] leading-snug text-slate-500">
                This will overwrite the lead&apos;s stored details.
              </p>
            </div>
          </div>
        </div>
        <div className="modal-body">
          <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
            You&apos;re changing {changes.length} {changes.length === 1 ? 'field' : 'fields'}
          </div>
          <ul className="m-0 mb-4 list-none divide-y divide-slate-100 overflow-hidden rounded-[10px] border border-slate-200 p-0">
            {changes.map((c) => (
              <li key={c} className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 text-[13.5px] font-medium leading-snug text-slate-800">
                <PencilLine size={14} aria-hidden className="shrink-0 text-indigo-500" />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <button type="button" disabled={saving} onClick={onCancel}>Go back</button>
          <button type="button" className="primary" disabled={saving} onClick={onConfirm} autoFocus>{saving ? 'Saving…' : 'Yes, save changes'}</button>
        </div>
      </div>
    </div>
  );
}
