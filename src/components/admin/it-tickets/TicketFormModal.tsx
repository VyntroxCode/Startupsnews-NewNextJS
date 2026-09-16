'use client';

import { useRef, useState } from 'react';
import { useTicketsApi } from './api';
import { PROJECT_NAME, STATUS_LABELS, TITLE_MAX } from './constants';
import { AssigneeSelect, PrioritySelect, TypeSelect } from './FieldSelects';
import Modal from './Modal';
import { AttachmentIcon, CloseIcon, UploadIcon } from './TicketIcons';
import {
  BTN_ICON, BTN_PRIMARY, BTN_SECONDARY, ERROR_BANNER, FIELD_INPUT, FIELD_LABEL, FIELD_OPTIONAL, FIELD_TEXTAREA, LINK,
} from './ui';
import { emptyDraft, formatFileSize } from './utils';
import type { ItTicket, ItTicketStatus, TicketAssignee, TicketDraft } from './types';

interface TicketFormModalProps {
  assignees: TicketAssignee[];
  canManage: boolean;
  currentUser: { id: number; role: string } | null;
  /** Board column "+ Create" — managers only; preselects the column's status. */
  initialStatus?: ItTicketStatus;
  onClose: () => void;
  /** Creates the ticket and returns the server row (needed for attachment uploads). */
  onSave: (draft: TicketDraft) => Promise<ItTicket>;
  /** Called once attachments picked in the dialog have been uploaded, so the card badge updates. */
  onAttached?: (ticketId: string, count: number) => void;
  onNotify?: (kind: 'success' | 'error', message: string) => void;
}

interface PendingUpload {
  file: File;
  pct: number;
  error?: string;
}

/** "Create ticket" dialog — Jira's field order (type, priority, summary, description, due, assignee,
 * attachments) in the admin panel's modal shell (same head/body/footer treatment as Sales Tracker). */
export default function TicketFormModal({ assignees, canManage, currentUser, initialStatus, onClose, onSave, onAttached, onNotify }: TicketFormModalProps) {
  const api = useTicketsApi();
  const [draft, setDraft] = useState<TicketDraft>(() => ({ ...emptyDraft(), status: initialStatus }));
  const [files, setFiles] = useState<PendingUpload[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof TicketDraft>(key: K, value: TicketDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setAssignee(a: TicketAssignee | null) {
    setDraft((prev) => ({ ...prev, assigneeId: a ? a.id : null, assigneeRole: a ? a.role : null, assigneeName: a ? a.name : null }));
  }

  // "Assign to me" lives in the label row (not under the select) so the Due date / Assignee pair
  // keeps equal heights. Identity is the (id, role) pair.
  const me = currentUser ? assignees.find((a) => a.id === currentUser.id && a.role === currentUser.role) : undefined;
  const assignedToMe = !!me && draft.assigneeId === me.id && draft.assigneeRole === me.role;

  const trimmedLength = draft.title.trim().length;
  const titleError = trimmedLength === 0
    ? 'Summary is required'
    : trimmedLength > TITLE_MAX ? `Summary must be ${TITLE_MAX} characters or fewer` : null;
  const showTitleError = touched && !!titleError;

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ file, pct: 0 }));
    setFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (titleError) {
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    let ticket: ItTicket;
    try {
      ticket = await onSave({ ...draft, title: draft.title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      setSaving(false);
      return;
    }

    // Sequential uploads so the per-file progress line is honest, not interleaved.
    let attached = 0;
    if (files.length > 0) {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        try {
          await api.uploadTicketAttachment(ticket.id, files[i].file, (pct) => {
            setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, pct } : f)));
          });
          attached += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, error: message } : f)));
        }
      }
      setUploading(false);
      if (attached > 0) onAttached?.(ticket.id, attached);
    }

    const failed = files.length - attached;
    onNotify?.(
      failed > 0 ? 'error' : 'success',
      failed > 0
        ? `${ticket.ticketKey} created, but ${failed} attachment${failed === 1 ? '' : 's'} failed to upload`
        : `${ticket.ticketKey} created`
    );

    if (createAnother && failed === 0) {
      setDraft({ ...emptyDraft(), status: initialStatus, type: draft.type, priority: draft.priority });
      setFiles([]);
      setTouched(false);
      setSaving(false);
      titleRef.current?.focus();
      return;
    }
    if (failed > 0) {
      setSaving(false);
      return; // leave the dialog open so the failed file names stay visible
    }
    onClose();
  }

  const busy = saving || uploading;

  return (
    <Modal onClose={busy ? () => {} : onClose} size="md" labelledBy="it-ticket-create-title" className="overflow-hidden">
      <form onSubmit={handleSubmit} noValidate data-testid="create-ticket-form">
        {/* Head */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-[18px]">
          <div className="min-w-0">
            <h2 id="it-ticket-create-title" className="m-0 text-[17px] font-bold leading-tight text-slate-900">Create ticket</h2>
            <p className="m-0 mt-1 truncate text-[12.5px] text-slate-500">
              Project <span className="font-semibold text-slate-700">{PROJECT_NAME}</span>
              {draft.status && draft.status !== 'open' && (
                <> · Starts in <span className="font-semibold text-slate-700">{STATUS_LABELS[draft.status]}</span></>
              )}
            </p>
          </div>
          <button type="button" className={BTN_ICON} onClick={onClose} aria-label="Close" disabled={busy}>
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-6 pb-6 pt-[22px]">
          {error && <div className={`${ERROR_BANNER} mb-4`} role="alert">{error}</div>}

          <div className="grid grid-cols-1 gap-x-4 gap-y-[18px] sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="ticket-type" className={FIELD_LABEL}>Issue type</label>
              <TypeSelect id="ticket-type" value={draft.type} onChange={(v) => update('type', v)} />
            </div>
            <div className="min-w-0">
              <label htmlFor="ticket-priority" className={FIELD_LABEL}>Priority</label>
              <PrioritySelect id="ticket-priority" value={draft.priority} onChange={(v) => update('priority', v)} />
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="ticket-title" className={FIELD_LABEL}>
                Summary <span className="text-[#6366F1]">*</span>
              </label>
              <input
                id="ticket-title"
                ref={titleRef}
                type="text"
                className={`${FIELD_INPUT} ${showTitleError ? 'border-red-600 ring-[3px] ring-red-100 hover:border-red-600 focus:border-red-600 focus:ring-red-100' : ''}`}
                value={draft.title}
                onChange={(e) => update('title', e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Short, specific summary — e.g. “Laptop won’t connect to office Wi-Fi”"
                autoFocus
                maxLength={TITLE_MAX + 20}
                aria-invalid={showTitleError}
                aria-describedby="ticket-title-help"
              />
              <div id="ticket-title-help" className="mt-1.5 flex items-start justify-between gap-3 text-xs">
                <span className={`min-w-0 font-semibold ${showTitleError ? 'text-red-600' : 'text-transparent'}`}>{titleError ?? '.'}</span>
                <span className={`shrink-0 tabular-nums ${trimmedLength > TITLE_MAX ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
                  {draft.title.length}/{TITLE_MAX}
                </span>
              </div>
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="ticket-description" className={FIELD_LABEL}>
                Description <span className={FIELD_OPTIONAL}>(optional)</span>
              </label>
              <textarea
                id="ticket-description"
                className={`${FIELD_TEXTAREA} min-h-[120px] max-h-[320px]`}
                value={draft.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What’s going on? Steps to reproduce, device details, error messages…"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="ticket-due" className={FIELD_LABEL}>
                Due date <span className={FIELD_OPTIONAL}>(optional)</span>
              </label>
              <input id="ticket-due" type="date" className={FIELD_INPUT} value={draft.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
            </div>

            {canManage && (
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="ticket-assignee" className="block text-[12.5px] font-semibold text-slate-600">
                    Assignee <span className={FIELD_OPTIONAL}>(optional)</span>
                  </label>
                  {me && !assignedToMe && (
                    <button type="button" className={LINK} onClick={() => setAssignee(me)}>
                      Assign to me
                    </button>
                  )}
                </div>
                <AssigneeSelect
                  id="ticket-assignee"
                  assignees={assignees}
                  currentUser={currentUser}
                  showAssignToMe={false}
                  value={{ id: draft.assigneeId, role: draft.assigneeRole, name: draft.assigneeName }}
                  onChange={setAssignee}
                />
              </div>
            )}

            <div className="min-w-0 sm:col-span-2">
              <span className={FIELD_LABEL}>
                Attachments <span className={FIELD_OPTIONAL}>(optional)</span>
              </span>
              <label
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3.5 text-center text-[13px] text-slate-500 transition-colors hover:border-[#6366F1] hover:bg-[#EEF2FF]/60 ${busy ? 'pointer-events-none opacity-60' : ''}`}
              >
                <UploadIcon size={16} className="shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="font-semibold text-[#4F46E5]">Choose files</span> — uploaded right after the ticket is created
                </span>
                <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={(e) => pickFiles(e.target.files)} disabled={busy} />
              </label>

              {files.length > 0 && (
                <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                  {files.map((f, i) => (
                    <li key={`${f.file.name}-${i}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]">
                      <AttachmentIcon className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-slate-700" title={f.file.name}>{f.file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{formatFileSize(f.file.size)}</span>
                      {f.error ? (
                        <span className="shrink-0 text-xs font-semibold text-red-600" title={f.error}>Failed</span>
                      ) : uploading || f.pct > 0 ? (
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#4F46E5]">{f.pct}%</span>
                      ) : (
                        <button type="button" className={`${BTN_ICON} h-7 w-7`} aria-label={`Remove ${f.file.name}`} onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                          <CloseIcon size={13} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer — same grey action bar as the Sales Tracker modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13.5px] text-slate-600">
            <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[#6366F1]" checked={createAnother} onChange={(e) => setCreateAnother(e.target.checked)} data-testid="create-another" />
            Create another
          </label>
          <div className="flex gap-2.5">
            <button type="button" className={BTN_SECONDARY} onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={busy} data-testid="create-submit">
              {uploading ? 'Uploading…' : saving ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
