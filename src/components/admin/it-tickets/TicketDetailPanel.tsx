'use client';

import { useEffect, useRef, useState } from 'react';
import { useTicketsApi, type TicketPatch } from './api';
import { useTicketsClient } from './TicketsClientContext';
import Avatar from './Avatar';
import { PROJECT_NAME, TITLE_MAX } from './constants';
import { AssigneeSelect, PrioritySelect, TypeSelect } from './FieldSelects';
import Modal from './Modal';
import StatusLozenge from './StatusLozenge';
import { CloseIcon, FileIcon, ImageIcon, LinkIcon, TrashIcon, UploadIcon } from './TicketIcons';
import {
  BTN_ICON, BTN_PRIMARY, BTN_SECONDARY, EMPLOYEE_TAG, ERROR_BANNER, FIELD_INPUT_COMPACT, FIELD_TEXTAREA, META_LABEL,
} from './ui';
import { formatDate, formatDateTime, formatFileSize, isOverdue, relativeTime, ticketPermalink } from './utils';
import type { ItTicket, ItTicketAttachment, ItTicketComment, ItTicketStatus, TicketAssignee } from './types';

interface TicketDetailPanelProps {
  ticket: ItTicket;
  assignees: TicketAssignee[];
  canManage: boolean;
  canDelete: boolean;
  currentUser: { id: number; role: string; name: string } | null;
  onClose: () => void;
  /** Persists a patch and resolves with the server's row. */
  onUpdate: (patch: TicketPatch) => Promise<ItTicket>;
  /** Shared status policy — e.g. Blocked is Admin-only. */
  canSetStatus: (from: ItTicketStatus | null, to: ItTicketStatus) => boolean;
  onDelete: () => Promise<void>;
  /** Local-only patch for the comment/attachment count badges on the card. */
  onLocalPatch: (partial: Partial<ItTicket>) => void;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith('image/');
}

/** Jira issue view: content column on the left, status + details sidebar on the right. */
export default function TicketDetailPanel({
  ticket, assignees, canManage, canDelete, currentUser, onClose, onUpdate, onDelete, onLocalPatch, onNotify, canSetStatus,
}: TicketDetailPanelProps) {
  const api = useTicketsApi();
  const client = useTicketsClient();
  // Only IT staff need to tell employee-portal people apart; in the employee view it's always them or IT.
  const showEmployeeTag = client.variant === 'admin';
  // Identity is the (id, role) pair — ids overlap between the two staff tables.
  const isMe = (id: number, role: string) => !!currentUser && currentUser.id === id && currentUser.role === role;
  const isReporter = isMe(ticket.reporterId, ticket.reporterRole);
  const canEditBasics = canManage || (isReporter && ticket.status === 'open');

  const [title, setTitle] = useState(ticket.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(ticket.description ?? '');
  const [comments, setComments] = useState<ItTicketComment[] | null>(null);
  const [attachments, setAttachments] = useState<ItTicketAttachment[] | null>(null);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [upload, setUpload] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyed on ticket.id only: re-syncing local title/description whenever the parent's ticket object
  // changes (e.g. after our own saveField() calls) would clobber whatever the user is mid-typing.
  useEffect(() => {
    setTitle(ticket.title);
    setDescription(ticket.description ?? '');
    setEditingDescription(false);
    setComments(null);
    setAttachments(null);
    setError(null);
    api.fetchComments(ticket.id).then(setComments).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load comments'));
    api.fetchAttachments(ticket.id).then(setAttachments).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attachments'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  async function saveField(patch: TicketPatch, successMessage?: string): Promise<boolean> {
    setError(null);
    try {
      await onUpdate(patch);
      if (successMessage) onNotify('success', successMessage);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update ticket';
      setError(message);
      return false;
    }
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === ticket.title) {
      setTitle(ticket.title);
      return;
    }
    if (next.length > TITLE_MAX) {
      setError(`Summary must be ${TITLE_MAX} characters or fewer`);
      return;
    }
    const ok = await saveField({ title: next });
    if (!ok) setTitle(ticket.title);
  }

  async function saveDescription() {
    if (description !== (ticket.description ?? '')) {
      const ok = await saveField({ description });
      if (!ok) return;
    }
    setEditingDescription(false);
  }

  async function handleStatus(status: ItTicketStatus) {
    if (status === ticket.status) return;
    await saveField({ status }, `${ticket.ticketKey} moved to ${statusLabel(status)}`);
  }

  async function handlePostComment() {
    const body = newComment.trim();
    if (!body) return;
    setPosting(true);
    setError(null);
    try {
      const comment = await api.addComment(ticket.id, body);
      setComments((prev) => [...(prev ?? []), comment]);
      setNewComment('');
      onLocalPatch({ commentCount: ticket.commentCount + 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.deleteComment(ticket.id, commentId);
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
      onLocalPatch({ commentCount: Math.max(0, ticket.commentCount - 1) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete comment');
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
    let added = 0;
    for (const file of picked) {
      setUpload({ name: file.name, pct: 0 });
      try {
        const attachment = await api.uploadTicketAttachment(ticket.id, file, (pct) => setUpload({ name: file.name, pct }));
        setAttachments((prev) => [...(prev ?? []), attachment]);
        added += 1;
      } catch (err) {
        setError(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`);
      }
    }
    setUpload(null);
    if (added > 0) onLocalPatch({ attachmentCount: ticket.attachmentCount + added });
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await api.deleteAttachment(ticket.id, attachmentId);
      setAttachments((prev) => (prev ?? []).filter((a) => a.id !== attachmentId));
      onLocalPatch({ attachmentCount: Math.max(0, ticket.attachmentCount - 1) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove attachment');
    }
  }

  async function copyLink() {
    const url = ticketPermalink(ticket.ticketKey, client.pagePath);
    try {
      await navigator.clipboard.writeText(url);
      onNotify('success', 'Link copied');
    } catch {
      onNotify('info', url);
    }
  }

  const overdue = isOverdue(ticket);

  return (
    <Modal onClose={onClose} size="xl" labelledBy="it-ticket-detail-title" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3">
        <nav className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
          <span>{PROJECT_NAME}</span>
          <span aria-hidden>/</span>
          <span className="text-slate-700" data-testid="detail-key">{ticket.ticketKey}</span>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={BTN_ICON} onClick={copyLink} aria-label="Copy link" title="Copy link">
            <LinkIcon />
          </button>
          {canDelete && (
            <button type="button" className={`${BTN_ICON} hover:bg-red-50 hover:text-red-700`} onClick={onDelete} aria-label="Delete ticket" title="Delete ticket" data-testid="delete-ticket">
              <TrashIcon />
            </button>
          )}
          <button type="button" className={BTN_ICON} onClick={onClose} aria-label="Close" title="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="grid max-h-[82vh] grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: content */}
        <div className="min-w-0 px-6 py-5">
          {error && <div className={`${ERROR_BANNER} mb-4`} role="alert">{error}</div>}

          {canEditBasics ? (
            <input
              id="it-ticket-detail-title"
              type="text"
              value={title}
              aria-label="Summary"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                if (e.key === 'Escape') { e.stopPropagation(); setTitle(ticket.title); (e.target as HTMLInputElement).blur(); }
              }}
              className="-ml-2 w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-sans text-xl font-semibold leading-snug text-slate-900 transition-colors hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          ) : (
            <h2 id="it-ticket-detail-title" className="m-0 text-xl font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere]">{ticket.title}</h2>
          )}

          <h3 className="mb-1.5 mt-5 text-sm font-semibold text-slate-800">Description</h3>
          {canEditBasics && editingDescription ? (
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
                aria-label="Description"
                className={`${FIELD_TEXTAREA} min-h-[120px]`}
                placeholder="Add a description…"
              />
              <div className="mt-2 flex gap-2">
                <button type="button" className={BTN_PRIMARY} onClick={saveDescription}>Save</button>
                <button type="button" className={BTN_SECONDARY} onClick={() => { setDescription(ticket.description ?? ''); setEditingDescription(false); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div
              className={`whitespace-pre-wrap rounded-lg px-3 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${ticket.description ? 'text-slate-700' : 'italic text-slate-400'} ${canEditBasics ? 'cursor-text -mx-3 hover:bg-slate-50' : 'bg-slate-50'}`}
              onClick={canEditBasics ? () => setEditingDescription(true) : undefined}
              role={canEditBasics ? 'button' : undefined}
              tabIndex={canEditBasics ? 0 : undefined}
              onKeyDown={canEditBasics ? (e) => { if (e.key === 'Enter') setEditingDescription(true); } : undefined}
              data-testid="detail-description"
            >
              {ticket.description || (canEditBasics ? 'Add a description…' : 'No description provided.')}
            </div>
          )}

          {/* Attachments */}
          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Attachments {attachments && attachments.length > 0 && <span className="text-slate-400">({attachments.length})</span>}
            </h3>
            <label className={`${BTN_SECONDARY} cursor-pointer py-1.5 ${upload ? 'pointer-events-none opacity-60' : ''}`}>
              <UploadIcon size={14} /> {upload ? `${upload.pct}% ${upload.name}` : 'Attach'}
              <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFilesSelected} disabled={!!upload} />
            </label>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {attachments === null && <div className="text-sm text-slate-400">Loading…</div>}
            {attachments && attachments.length === 0 && <div className="text-sm text-slate-400">No files attached.</div>}
            {attachments?.map((a) => (
              <div className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm" key={a.id}>
                <span className="text-slate-400">{isImage(a.mimeType) ? <ImageIcon /> : <FileIcon />}</span>
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-indigo-700 hover:underline">
                  {a.fileName}
                </a>
                <span className="hidden flex-shrink-0 text-xs text-slate-400 sm:inline">{formatFileSize(a.fileSize)}</span>
                <span className="hidden flex-shrink-0 text-xs text-slate-400 md:inline" title={formatDateTime(a.createdAt)}>
                  {a.uploadedByName} · {relativeTime(a.createdAt)}
                </span>
                {(canManage || isMe(a.uploadedById, a.uploadedByRole)) && (
                  <button type="button" className={`${BTN_ICON} h-7 w-7 hover:text-red-600`} aria-label={`Remove ${a.fileName}`} onClick={() => handleDeleteAttachment(a.id)}>
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Activity */}
          <h3 className="mb-3 mt-7 text-sm font-semibold text-slate-800">Activity</h3>
          <div className="flex gap-3">
            <Avatar name={currentUser?.name ?? null} size="md" />
            <div className="min-w-0 flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handlePostComment(); }
                }}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className={`${FIELD_TEXTAREA} min-h-[44px]`}
                data-testid="comment-input"
              />
              {newComment.trim() && (
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" className={BTN_PRIMARY} onClick={handlePostComment} disabled={posting} data-testid="comment-submit">
                    {posting ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className={BTN_SECONDARY} onClick={() => setNewComment('')} disabled={posting}>Cancel</button>
                  <span className="text-xs text-slate-400">Ctrl/⌘ + Enter to save</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4" data-testid="comment-list">
            {comments === null && <div className="text-sm text-slate-400">Loading…</div>}
            {comments && comments.length === 0 && <div className="text-sm text-slate-400">No comments yet.</div>}
            {comments?.map((c) => (
              <div className="flex gap-3" key={c.id}>
                <Avatar name={c.authorName} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{c.authorName}</span>
                    {showEmployeeTag && c.authorRole === 'employee' && <span className={EMPLOYEE_TAG}>Employee</span>}
                    <span className="text-xs text-slate-400" title={formatDateTime(c.createdAt)}>{relativeTime(c.createdAt)}</span>
                    {(canManage || isMe(c.authorId, c.authorRole)) && (
                      <button type="button" className="ml-auto border-0 bg-transparent p-0 font-sans text-xs text-slate-400 hover:text-red-600 focus:outline-none focus:underline" onClick={() => handleDeleteComment(c.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: status + details */}
        <aside className="border-t border-slate-200 bg-slate-50/60 px-5 py-5 lg:border-l lg:border-t-0">
          <StatusLozenge
            status={ticket.status}
            size="md"
            onChange={canManage ? handleStatus : undefined}
            isAllowed={(to) => canSetStatus(ticket.status, to)}
            aria-label="Status"
          />

          <div className="mt-5 rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Details</div>
            <dl className="flex flex-col gap-3 px-3 py-3">
              <div>
                <dt className={META_LABEL}>Assignee</dt>
                <dd className="mt-1">
                  {canManage ? (
                    <AssigneeSelect
                      assignees={assignees}
                      currentUser={currentUser}
                      variant="compact"
                      value={{ id: ticket.assigneeId, role: ticket.assigneeRole, name: ticket.assigneeName }}
                      onChange={(a) => saveField(
                        a ? { assigneeId: a.id, assigneeRole: a.role } : { assigneeId: null, assigneeRole: null },
                        a ? `Assigned to ${a.name}` : 'Unassigned'
                      )}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <Avatar name={ticket.assigneeName} size="xs" />
                      {ticket.assigneeName || <span className="text-slate-400">Unassigned</span>}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className={META_LABEL}>Reporter</dt>
                <dd className="mt-1 inline-flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Avatar name={ticket.reporterName} size="xs" />
                  {ticket.reporterName}
                  {showEmployeeTag && ticket.reporterRole === 'employee' && <span className={EMPLOYEE_TAG} data-testid="reporter-employee-tag">Employee</span>}
                </dd>
              </div>
              <div>
                <dt className={META_LABEL}>Priority</dt>
                <dd className="mt-1">
                  <PrioritySelect variant="compact" value={ticket.priority} disabled={!canManage} onChange={(v) => saveField({ priority: v })} />
                </dd>
              </div>
              <div>
                <dt className={META_LABEL}>Type</dt>
                <dd className="mt-1">
                  <TypeSelect variant="compact" value={ticket.type} disabled={!canManage} onChange={(v) => saveField({ type: v })} />
                </dd>
              </div>
              <div>
                <dt className={META_LABEL}>Due date</dt>
                <dd className="mt-1">
                  {canManage ? (
                    <input
                      type="date"
                      aria-label="Due date"
                      className={`${FIELD_INPUT_COMPACT} ${overdue ? 'text-red-600' : ''}`}
                      value={ticket.dueDate ?? ''}
                      onChange={(e) => saveField({ dueDate: e.target.value || null })}
                    />
                  ) : (
                    <span className={`px-2 text-sm ${overdue ? 'font-semibold text-red-600' : 'text-slate-700'}`}>
                      {ticket.dueDate ? `${overdue ? 'Overdue · ' : ''}${formatDate(ticket.dueDate)}` : <span className="text-slate-400">None</span>}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <dl className="mt-4 flex flex-col gap-1 px-1 text-xs text-slate-500">
            <div className="flex justify-between gap-2"><dt>Created</dt><dd title={formatDateTime(ticket.createdAt)}>{relativeTime(ticket.createdAt)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Updated</dt><dd title={formatDateTime(ticket.updatedAt)} data-testid="detail-updated">{relativeTime(ticket.updatedAt)}</dd></div>
            {ticket.resolvedAt && (
              <div className="flex justify-between gap-2"><dt>Resolved</dt><dd title={formatDateTime(ticket.resolvedAt)}>{relativeTime(ticket.resolvedAt)}</dd></div>
            )}
          </dl>
        </aside>
      </div>
    </Modal>
  );
}

function statusLabel(status: ItTicketStatus): string {
  switch (status) {
    case 'open': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'blocked': return 'Blocked';
    case 'resolved': return 'Resolved';
    case 'closed': return 'Closed';
    default: return status;
  }
}
