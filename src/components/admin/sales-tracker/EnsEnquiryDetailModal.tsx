'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Lock, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { EnsTravelEnquiry, EnsTravelEnquiryAdminInput } from '@/modules/ens-travel-enquiries/domain/types';
import {
  CONVERSATION_NOTE_MAX_LENGTH,
  LEAD_STATUS_OPTIONS,
  leadStatusTakesNote,
  NO_STATUS_LABEL,
} from '@/modules/ens-travel-enquiries/domain/lead-status';
import {
  PACKAGE_INCLUSIONS,
  packageFor,
  PARTICIPATION_OPTIONS,
  PARTICIPATION_OTHERS,
  REQUIREMENT_MAX_LENGTH,
} from '@/modules/ens-travel-enquiries/domain/participation';
import {
  FOUND_US_DETAIL_MAX_LENGTH,
  FOUND_US_OPTIONS,
  FOUND_US_OTHERS,
  NO_REFERRER_LABEL,
  REFERRED_BY_OPTIONS,
} from '@/modules/ens-travel-enquiries/domain/sources';
import { COUNTRY_NAMES } from '@/modules/partnership-events/domain/country-city-data';
import {
  type AssignableEmployee,
  assignmentToDraft,
  type DepartmentOption,
  type LeadAssignment,
  type LeadAssignmentDraft,
  sameAssignmentDraft,
} from '@/modules/lead-assignments/domain/types';
import FollowUpsPanel from './FollowUpsPanel';
import SaveConfirmDialog from './SaveConfirmDialog';
import LeadAssignmentFields from './LeadAssignmentFields';
import LeadMessagesPanel from './LeadMessagesPanel';
import { salesTrackerApi } from './api';
import { ENS_ENQUIRY_TYPE_LABEL, PAGE_LEAD_LABELS } from './constants';
import { updateEnsEnquiry } from './ensEnquiriesApi';
import { formatSubmittedOn, whatsappLink } from './sponsorEventFormat';

function toInput(e: EnsTravelEnquiry): EnsTravelEnquiryAdminInput {
  return {
    name: e.name,
    email: e.email,
    contact: e.contact,
    city: e.city,
    country: e.country,
    participation: e.participation,
    requirement: e.requirement,
    referredBy: e.referredBy,
    foundUs: e.foundUs,
    foundUsDetail: e.foundUsDetail,
    leadStatus: e.leadStatus,
    conversationNote: e.conversationNote,
  };
}

/** Field labels for the save warning, in form order. */
const FIELD_LABELS: Record<keyof EnsTravelEnquiryAdminInput, string> = {
  name: 'Name',
  contact: 'Contact no.',
  email: 'Email ID',
  country: 'Country',
  city: 'City',
  participation: 'Participating as',
  requirement: 'Requirement',
  referredBy: 'Referred by',
  foundUs: 'How they found us',
  foundUsDetail: 'In their words',
  leadStatus: 'Status',
  conversationNote: 'Conversation result',
};

/** One /expand-north-star enquiry, in the same window layout as every other Sales Tracker lead
 * (LeadFormModal): labelled form rows that open straight into edit mode (no "Edit lead" step),
 * Departments + Assigned to, the message panel, Status, then the employee follow-ups.
 * Only the fields differ — this record lives in ens_travel_enquiries, so it shows what the public
 * page collects (participation package, referred by, how they found us) and saves through its own
 * PATCH endpoint, then the assignment (`onAssign`), then an optional message (sent last, since it
 * needs the people stored first). Source and Type of lead are fixed by the page, so they're shown
 * locked. "Save changes" first shows SaveConfirmDialog listing what changed; confirming saves and
 * stamps "Last updated". Closing with unsaved edits asks before throwing them away. */
export default function EnsEnquiryDetailModal({ enquiry, employees, departments, assignment, onAssign, onClose, onSaved }: {
  enquiry: EnsTravelEnquiry;
  employees: AssignableEmployee[];
  departments: DepartmentOption[];
  /** The enquiry's stored departments and people, if any. */
  assignment?: LeadAssignment;
  onAssign: (draft: LeadAssignmentDraft) => Promise<void>;
  onClose: () => void;
  onSaved: (updated: EnsTravelEnquiry) => void;
}) {
  const [current, setCurrent] = useState(enquiry);
  const [draft, setDraft] = useState<EnsTravelEnquiryAdminInput>(() => toInput(enquiry));
  const [assignmentDraft, setAssignmentDraft] = useState<LeadAssignmentDraft>(() => assignmentToDraft(assignment));
  const [messageDraft, setMessageDraft] = useState('');
  // Bumped after a save so LeadMessagesPanel re-reads the history.
  const [messagesVersion, setMessagesVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canMessage = assignmentDraft.departments.length > 0 && assignmentDraft.assignees.length > 0;
  const newMessage = canMessage ? messageDraft.trim() : '';
  const assignmentDirty = !sameAssignmentDraft(assignmentDraft, assignmentToDraft(assignment));
  const stored = toInput(current);
  const changes = [
    ...(Object.keys(FIELD_LABELS) as (keyof EnsTravelEnquiryAdminInput)[])
      .filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(stored[k]))
      .map((k) => FIELD_LABELS[k]),
    ...(assignmentDirty ? ['Departments / Assigned to'] : []),
    ...(newMessage ? ['New message for assigned employees'] : []),
  ];
  const dirty = changes.length > 0;

  function requestClose() {
    // Escape while the save warning is up only dismisses the warning.
    if (confirmOpen) { if (!saving) setConfirmOpen(false); return; }
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  }
  useEscapeKey(requestClose);

  function requestSave() {
    setMsg(null);
    setConfirmOpen(true);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload: EnsTravelEnquiryAdminInput = {
        ...draft,
        requirement: draft.participation === PARTICIPATION_OTHERS ? draft.requirement : '',
        foundUsDetail: draft.foundUs === FOUND_US_OTHERS ? draft.foundUsDetail : '',
        conversationNote: leadStatusTakesNote(draft.leadStatus) ? draft.conversationNote : '',
      };
      const saved = await updateEnsEnquiry(current.id, payload);
      setCurrent(saved);
      setDraft(toInput(saved));
      onSaved(saved);
      // The enquiry is saved by now; if only the assignment fails, say so and keep the draft so it
      // can be retried (saving again is safe — both saves replace).
      if (assignmentDirty) {
        try { await onAssign(assignmentDraft); } catch (err) {
          setMsg({ kind: 'err', text: `Details saved, but the assignment wasn't: ${err instanceof Error ? err.message : 'try again'}` });
          return;
        }
      }
      // After the assignment: the message needs the people stored first.
      if (newMessage) {
        try {
          await salesTrackerApi.addMessage('ens', current.id, newMessage);
          setMessageDraft('');
          setMessagesVersion((v) => v + 1);
        } catch (err) {
          setMsg({ kind: 'err', text: `Details saved, but the message wasn't: ${err instanceof Error ? err.message : 'try again'}` });
          return;
        }
      }
      setMsg({ kind: 'ok', text: `Changes saved · last updated ${formatSubmittedOn(saved.updatedAt ?? undefined)}` });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : "Couldn't save the changes" });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  const e = current;
  const pack = packageFor(draft.participation);
  const pageLabel = PAGE_LEAD_LABELS[ENS_ENQUIRY_TYPE_LABEL];
  const set = <K extends keyof EnsTravelEnquiryAdminInput>(key: K, value: EnsTravelEnquiryAdminInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const lockNote = (why: string) => <span className="lock-hint" title={why}><Lock size={11} aria-hidden />{why}</span>;
  const req = <span style={{ color: 'var(--pink)' }}>*</span>;

  return (
    <>
    <div className="modal-overlay open" onClick={(ev) => { if (ev.target === ev.currentTarget) requestClose(); }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="ee-modal-title">
        <div className="modal-head">
          <h2 id="ee-modal-title">Lead details</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={requestClose}><X size={20} aria-hidden /></button>
        </div>
        <div className="modal-body">
          <div className="hint" style={{ marginBottom: 10 }}>Edit any detail below, then click <strong>Save changes</strong>. You&apos;ll be asked to confirm before anything is saved.</div>
          <div className="row">
            <div className="field"><label>Arrival date {lockNote('Set when the enquiry arrived')}</label><input type="text" value={formatSubmittedOn(e.createdAt)} disabled readOnly /></div>
            <div className="field">
              <label>Last updated {lockNote('Changes automatically when you save an edit')}</label>
              <input type="text" value={e.updatedAt ? `${formatSubmittedOn(e.updatedAt)} · by ${e.updatedBy || 'an admin'}` : 'Never edited'} disabled readOnly />
            </div>
            <div className="field"><label htmlFor="ee-name">Name {req}</label>
              <input id="ee-name" type="text" maxLength={120} placeholder="Lead's name" value={draft.name} onChange={(ev) => set('name', ev.target.value)} />
            </div>
          </div>
          <div className="row">
            {/* Same fixed-basis width as LeadFormModal's Contact no., so the number doesn't stretch. */}
            <div style={{ flex: '0 1 360px', minWidth: 300 }}>
              <div className="field">
                <label htmlFor="ee-contact">Contact no. {req}</label>
                <input id="ee-contact" type="tel" maxLength={24} placeholder="+91 9876543210" value={draft.contact} onChange={(ev) => set('contact', ev.target.value)} />
                <div className="hint">With the country code, e.g. +971 501234567</div>
                {e.contact && <a href={whatsappLink(e.contact)} target="_blank" rel="noopener noreferrer" className="hint ic-text" style={{ marginTop: 4 }}>Open in WhatsApp<ArrowUpRight size={12} aria-hidden /></a>}
              </div>
            </div>
            <div className="field"><label htmlFor="ee-email">Email ID {req}</label>
              <input id="ee-email" type="email" maxLength={160} placeholder="name@company.com" value={draft.email} onChange={(ev) => set('email', ev.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="ee-country">Country {req}</label>
              <input id="ee-country" type="text" maxLength={120} list="ee-country-list" placeholder="—" value={draft.country} onChange={(ev) => set('country', ev.target.value)} />
              <datalist id="ee-country-list">
                {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="field"><label htmlFor="ee-city">City {req}</label>
              <input id="ee-city" type="text" maxLength={120} placeholder="—" value={draft.city} onChange={(ev) => set('city', ev.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="field"><label>Source of lead {lockNote(`Set by the ${pageLabel} page`)}</label><input type="text" value={pageLabel} disabled readOnly /></div>
            <div className="field"><label>Type of lead {lockNote(`Set by the ${pageLabel} page`)}</label>
              <select value={ENS_ENQUIRY_TYPE_LABEL} disabled><option>{ENS_ENQUIRY_TYPE_LABEL}</option></select>
            </div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="ee-participation">Participating as {req}</label>
              <select id="ee-participation" value={draft.participation} onChange={(ev) => set('participation', ev.target.value as EnsTravelEnquiryAdminInput['participation'])}>
                {PARTICIPATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {pack && (
                <ul className="ee-inclusions" style={{ marginTop: 10 }}>
                  {PACKAGE_INCLUSIONS[pack].map((item) => (
                    <li key={item.text} className={item.highlight ? 'is-highlight' : undefined}><Check size={14} strokeWidth={3} aria-hidden />{item.text}</li>
                  ))}
                </ul>
              )}
            </div>
            {draft.participation === PARTICIPATION_OTHERS && (
              <div className="field"><label htmlFor="ee-requirement">Requirement {req}</label>
                <textarea id="ee-requirement" maxLength={REQUIREMENT_MAX_LENGTH} placeholder="—" value={draft.requirement} onChange={(ev) => set('requirement', ev.target.value)} />
                <div className="hint">{draft.requirement.length} / {REQUIREMENT_MAX_LENGTH}</div>
              </div>
            )}
          </div>
          <div className="row">
            <div className="field"><label htmlFor="ee-referred-by">Referred by</label>
              <select id="ee-referred-by" value={draft.referredBy} onChange={(ev) => set('referredBy', ev.target.value as EnsTravelEnquiryAdminInput['referredBy'])}>
                <option value="">{NO_REFERRER_LABEL}</option>
                {REFERRED_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="ee-found-us">How they found us {req}</label>
              <select id="ee-found-us" value={draft.foundUs} onChange={(ev) => set('foundUs', ev.target.value as EnsTravelEnquiryAdminInput['foundUs'])}>
                {FOUND_US_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {draft.foundUs === FOUND_US_OTHERS && (
              <div className="field"><label htmlFor="ee-found-us-detail">In their words {req}</label>
                <input id="ee-found-us-detail" type="text" maxLength={FOUND_US_DETAIL_MAX_LENGTH} placeholder="—" value={draft.foundUsDetail} onChange={(ev) => set('foundUsDetail', ev.target.value)} />
              </div>
            )}
          </div>
          <LeadAssignmentFields
            idPrefix="ee"
            employees={employees}
            departments={departments}
            assignment={assignment}
            value={assignmentDraft}
            onChange={setAssignmentDraft}
          />
          <LeadMessagesPanel
            idPrefix="ee"
            source="ens"
            leadId={e.id}
            canWrite={canMessage}
            value={messageDraft}
            onChange={setMessageDraft}
            refreshKey={messagesVersion}
          />
          <div className="row">
            <div className="field"><label htmlFor="ee-lead-status">Status</label>
              <select id="ee-lead-status" value={draft.leadStatus ?? ''} onChange={(ev) => set('leadStatus', (ev.target.value || null) as EnsTravelEnquiryAdminInput['leadStatus'])}>
                <option value="">{NO_STATUS_LABEL}</option>
                {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {leadStatusTakesNote(draft.leadStatus) && (
            <div className="row">
              <div className="field" style={{ flexBasis: '100%' }}><label htmlFor="ee-conversation-note">Conversation result</label>
                <textarea id="ee-conversation-note" maxLength={CONVERSATION_NOTE_MAX_LENGTH} placeholder="What happened on the call / chat, and what was agreed next" value={draft.conversationNote} onChange={(ev) => set('conversationNote', ev.target.value)} />
                <div className="hint">{draft.conversationNote.length} / {CONVERSATION_NOTE_MAX_LENGTH}</div>
              </div>
            </div>
          )}
          {/* Read-only; its content isn't part of this form. */}
          <FollowUpsPanel source="ens" leadId={e.id} />
          {msg && <div className={`msg ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
        </div>
        <div className="modal-actions">
          <button type="button" disabled={saving} onClick={requestClose}>Close</button>
          <button type="button" className="primary" disabled={saving || !dirty} onClick={requestSave}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
    {confirmOpen && (
      <SaveConfirmDialog changes={changes} saving={saving} onCancel={() => setConfirmOpen(false)} onConfirm={() => void save()} />
    )}
    </>
  );
}
