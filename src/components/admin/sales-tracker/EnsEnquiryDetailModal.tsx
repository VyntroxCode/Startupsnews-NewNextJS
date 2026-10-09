'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Check, Lock, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PhoneField } from '@/components/ui/PhoneField';
import { composePhone } from '@/components/lead-forms/shared/compose';
import { validatePhone } from '@/components/lead-forms/shared/validation';
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
  statusFromEns,
} from '@/modules/lead-assignments/domain/types';
import { localToday, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';
import SaveConfirmDialog from './SaveConfirmDialog';
import LeadAssignmentFields from './LeadAssignmentFields';
import LeadActivityPanel from './LeadActivityPanel';
import { ENS_ENQUIRY_TYPE_LABEL, LEAD_FORM_GRID, PAGE_LEAD_LABELS } from './constants';
import { updateEnsEnquiry } from './ensEnquiriesApi';
import { formatSubmittedOn, whatsappLink } from './sponsorEventFormat';
import { splitPhone } from './utils';

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
    nextFollowUpDate: e.nextFollowUpDate,
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
  nextFollowUpDate: 'Next follow-up date',
};

/** One /expand-north-star enquiry, in the same window layout as every other Sales Tracker lead
 * (LeadFormModal): labelled form rows that open straight into edit mode (no "Edit lead" step),
 * Departments + Assigned to, Status, then Lead activity (the follow-ups timeline).
 * Only the fields differ — this record lives in ens_travel_enquiries, so it shows what the public
 * page collects (participation package, referred by, how they found us) and saves through its own
 * PATCH endpoint, then the assignment (`onAssign`) — so one Save changes does everything.
 * Source and Type of lead are fixed by the page, so they're shown
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
  // Bumped after a save, so LeadActivityPanel re-reads the history.
  const [activityVersion, setActivityVersion] = useState(0);
  // Contact no. is edited through the same PhoneField (country-code picker + number) the public
  // forms and LeadFormModal use. `phone` holds its three inputs; every edit writes the composed
  // "+code number" back to draft.contact, so an untouched number is saved exactly as stored.
  const [phone, setPhone] = useState(() => splitPhone(enquiry.contact));
  const phoneRef = useRef(phone);
  const [contactError, setContactError] = useState('');
  // Next follow-up date: the admin's own date, compulsory while the enquiry is open (Pending /
  // Follow Up) — same rule as LeadFormModal. A newly picked date can't be in the past.
  const needsFollowUpDate = statusNeedsFollowUpDate(statusFromEns(draft.leadStatus));
  const today = localToday();
  const [followUpDateError, setFollowUpDateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const assignmentDirty = !sameAssignmentDraft(assignmentDraft, assignmentToDraft(assignment));
  const stored = toInput(current);
  const changes = [
    ...(Object.keys(FIELD_LABELS) as (keyof EnsTravelEnquiryAdminInput)[])
      .filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(stored[k]))
      .map((k) => FIELD_LABELS[k]),
    ...(assignmentDirty ? ['Departments / Assigned to'] : []),
  ];
  const dirty = changes.length > 0;

  function requestClose() {
    // Escape while the save warning is up only dismisses the warning.
    if (confirmOpen) { if (!saving) setConfirmOpen(false); return; }
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  }
  useEscapeKey(requestClose);

  const phoneParts = (p: typeof phone) => ({ ...p, phone: composePhone({ ...p, phone: '' }) });

  // PhoneField validates straight after a code change, before `phone` has re-rendered — so the
  // check reads the ref, which always holds the latest parts.
  function updatePhone(patch: Partial<typeof phone>) {
    const next = { ...phoneRef.current, ...patch };
    phoneRef.current = next;
    setPhone(next);
    setDraft((d) => ({ ...d, contact: phoneParts(next).phone }));
    if (contactError) setContactError(validatePhone(phoneParts(next)));
  }

  function requestSave() {
    setMsg(null);
    // Only a number the admin changed is checked, so an older record stored in another format
    // doesn't block saving an unrelated edit.
    if (draft.contact !== stored.contact) {
      const err = validatePhone(phoneParts(phoneRef.current));
      setContactError(err);
      if (err) { setMsg({ kind: 'err', text: 'Please enter a valid contact number.' }); return; }
    }
    if (needsFollowUpDate) {
      const dateErr = !draft.nextFollowUpDate
        ? 'Please pick the next follow-up date.'
        : draft.nextFollowUpDate !== stored.nextFollowUpDate && draft.nextFollowUpDate < today
        ? 'The next follow-up date cannot be in the past.'
        : '';
      setFollowUpDateError(dateErr);
      if (dateErr) { setMsg({ kind: 'err', text: dateErr }); return; }
    }
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
      // A status / conversation-result change has just been added to the lead's history.
      setActivityVersion((v) => v + 1);
      phoneRef.current = splitPhone(saved.contact);
      setPhone(phoneRef.current);
      setContactError('');
      onSaved(saved);
      // The enquiry is saved by now; if only the assignment fails, say so and keep the draft so it
      // can be retried (saving again is safe — both saves replace).
      if (assignmentDirty) {
        // The assignment change joins the history entry this save just wrote — re-read it after.
        try { await onAssign(assignmentDraft); setActivityVersion((v) => v + 1); } catch (err) {
          setMsg({ kind: 'err', text: `Details saved, but the assignment wasn't: ${err instanceof Error ? err.message : 'try again'}` });
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
          <div className={LEAD_FORM_GRID}>
            <div className="field"><label>Lead Creation Date {lockNote('Set when the enquiry was created')}</label><input type="text" value={formatSubmittedOn(e.createdAt)} disabled readOnly /></div>
            <div className="field">
              <label>Last updated {lockNote('Changes automatically when you save an edit')}</label>
              <input type="text" value={e.updatedAt ? `${formatSubmittedOn(e.updatedAt)} · by ${e.updatedBy || 'an admin'}` : 'Never edited'} disabled readOnly />
            </div>
            <div className="field"><label htmlFor="ee-name">Name {req}</label>
              <input id="ee-name" type="text" maxLength={120} placeholder="Lead's name" value={draft.name} onChange={(ev) => set('name', ev.target.value)} />
            </div>
            <div className="min-w-0">
              <PhoneField
                allowOtherCode
                id="ee-contact"
                label="Contact no."
                phoneCode={phone.phoneCode}
                phoneCodeCustom={phone.phoneCodeCustom}
                phoneNumber={phone.phoneNumber}
                error={contactError}
                onChangeCode={(v) => updatePhone({ phoneCode: v })}
                onChangeCustomCode={(v) => updatePhone({ phoneCodeCustom: v })}
                onChangeNumber={(v) => updatePhone({ phoneNumber: v })}
                onBlurValidate={() => setContactError(validatePhone(phoneParts(phoneRef.current)))}
              />
              {e.contact && <a href={whatsappLink(e.contact)} target="_blank" rel="noopener noreferrer" className="hint ic-text mt-1">Open in WhatsApp<ArrowUpRight size={12} aria-hidden /></a>}
            </div>
            <div className="field"><label htmlFor="ee-email">Email ID {req}</label>
              <input id="ee-email" type="email" maxLength={160} placeholder="name@company.com" value={draft.email} onChange={(ev) => set('email', ev.target.value)} />
            </div>
            <div className="field"><label htmlFor="ee-country">Country {req}</label>
              <input id="ee-country" type="text" maxLength={120} list="ee-country-list" placeholder="—" value={draft.country} onChange={(ev) => set('country', ev.target.value)} />
              <datalist id="ee-country-list">
                {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="field"><label htmlFor="ee-city">City</label>
              <input id="ee-city" type="text" maxLength={120} placeholder="—" value={draft.city} onChange={(ev) => set('city', ev.target.value)} />
            </div>
            <div className="field"><label>Source of lead {lockNote(`Set by the ${pageLabel} page`)}</label><input type="text" value={pageLabel} disabled readOnly /></div>
            <div className="field"><label>Type of lead {lockNote(`Set by the ${pageLabel} page`)}</label>
              <select value={ENS_ENQUIRY_TYPE_LABEL} disabled><option>{ENS_ENQUIRY_TYPE_LABEL}</option></select>
            </div>
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
            <LeadAssignmentFields
              idPrefix="ee"
              employees={employees}
              departments={departments}
              assignment={assignment}
              value={assignmentDraft}
              onChange={setAssignmentDraft}
            />
            <div className="field"><label htmlFor="ee-lead-status">Status</label>
              <select id="ee-lead-status" value={draft.leadStatus ?? ''} onChange={(ev) => set('leadStatus', (ev.target.value || null) as EnsTravelEnquiryAdminInput['leadStatus'])}>
                <option value="">{NO_STATUS_LABEL}</option>
                {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {needsFollowUpDate && (
              <div className="field"><label htmlFor="ee-next-follow-up">Next follow-up date {req}</label>
                <input
                  id="ee-next-follow-up"
                  type="date"
                  min={today}
                  className={followUpDateError ? 'invalid' : ''}
                  aria-invalid={!!followUpDateError}
                  value={draft.nextFollowUpDate}
                  onChange={(ev) => { set('nextFollowUpDate', ev.target.value); setFollowUpDateError(''); }}
                />
                {followUpDateError
                  ? <div className="hint text-[var(--danger)]!" role="alert">{followUpDateError}</div>
                  : <div className="hint">Your own date. The lead shows in Today&apos;s Follow up on this day.</div>}
              </div>
            )}
            {leadStatusTakesNote(draft.leadStatus) && (
              <div className="field col-span-full"><label htmlFor="ee-conversation-note">Conversation result</label>
                <textarea id="ee-conversation-note" maxLength={CONVERSATION_NOTE_MAX_LENGTH} placeholder="What happened on the call / chat, and what was agreed next" value={draft.conversationNote} onChange={(ev) => set('conversationNote', ev.target.value)} />
                <div className="hint">{draft.conversationNote.length} / {CONVERSATION_NOTE_MAX_LENGTH}</div>
              </div>
            )}
          </div>
          {/* Last, after every field: the lead's whole follow-up history in one timeline. */}
          <LeadActivityPanel source="ens" leadId={e.id} refreshKey={activityVersion} />
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
