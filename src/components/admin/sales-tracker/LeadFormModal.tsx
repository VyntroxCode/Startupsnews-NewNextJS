'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Lock, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PhoneField } from '@/components/ui/PhoneField';
import { CountryCityFields } from '@/components/submit-event/CountryCityFields';
import { COUNTRIES, OTHER_CITY_VALUE } from '@/components/submit-event/constants';
import { canonicalCountryName } from '@/modules/partnership-events/domain/country-city-data';
import { composeCountryCity, composePhone, resolveCity, resolveCountry } from '@/components/lead-forms/shared/compose';
import { createInitialLeadFormData, type LeadFormData } from '@/components/lead-forms/shared/types';
import { validatePhone } from '@/components/lead-forms/shared/validation';
import { type AssignableEmployee, assignmentToDraft, type DepartmentOption, type LeadAssignment, type LeadAssignmentDraft, sameAssignmentDraft, statusFromSalesLead } from '@/modules/lead-assignments/domain/types';
import { FOLLOW_UP_NOTE_MAX_LENGTH } from '@/modules/lead-followups/domain/types';
import { localToday, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';
import LeadAssignmentFields from './LeadAssignmentFields';
import LeadActivityPanel from './LeadActivityPanel';
import SaveConfirmDialog from './SaveConfirmDialog';
import { LEAD_FORM_GRID, PAGE_LEAD_LABELS, PAGE_LEAD_TYPES, STATUSES, TELL_US_MORE_LEAD_TYPES, TYPES } from './constants';
import { whatsappLink } from './sponsorEventFormat';
import type { SalesLead } from './types';
import { splitPhone } from './utils';

/** Field labels for the save warning, in form order. Contact/country/city are compared separately
 * (they live in `loc` until save). */
const FIELD_LABELS: Partial<Record<keyof SalesLead, string>> = {
  name: 'Name',
  company: 'Company name',
  email: 'Email ID',
  source: 'Source of lead',
  type: 'Type of lead',
  otherType: 'Specify type',
  status: 'Status',
  nextFollowUpDate: 'Next follow-up date',
  lastCallDiscussion: 'Last call discussion',
  eventTitle: 'Event title',
  eventSlug: 'Event URL / slug',
  eventDate: 'Event date',
  eventTime: 'Event time',
  externalUrl: 'External URL',
  posterUrl: 'Poster URL',
  description: 'Event description',
  budgetRange: 'Budget range',
  campaignGoal: 'Campaign goal',
};

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Stored country/city back into the dropdown state CountryCityFields expects. The country
 * dropdown has no "Other" row, so a stored value is matched to the list (aliases like
 * "United States" → "USA" via canonicalCountryName); a value that still isn't on the list is kept
 * on the draft untouched — the select shows its placeholder, and saving without re-picking leaves
 * the stored country exactly as it was. City is a plain text box here (`cityAsText`, like the
 * public lead pages): it is optional and free to type, so there is no city dropdown and no
 * "Others (Manually Fill)" step. The typed name sits in `cityOther` with `city` held at
 * OTHER_CITY_VALUE, which is how resolveCity has always read a hand-typed city. */
function splitLocation(country: string, city: string): Pick<LeadFormData, 'country' | 'countryOther' | 'city' | 'cityOther'> {
  let countryValue = '';
  if (country) {
    const canon = canonicalCountryName(country);
    const listed = COUNTRIES.find((c) => c === country || c.toLowerCase() === canon.toLowerCase());
    countryValue = listed ?? country;
  }
  return { country: countryValue, countryOther: '', city: OTHER_CITY_VALUE, cityOther: city };
}

function toLocationFormData(lead: SalesLead): LeadFormData {
  const data = createInitialLeadFormData({
    ...splitPhone(lead.contact),
    ...splitLocation(lead.country, lead.city),
  });
  return { ...data, phone: composePhone(data), countryCity: composeCountryCity(data) };
}

/** Add/view/edit lead modal — mount it fresh per open (parent renders it conditionally) so its
 * internal state always starts from the `lead` passed in, whether that's a blank draft or
 * an existing lead being edited.
 *
 * The Contact no. and Country/City fields are the very same PhoneField / CountryCityFields
 * components (and the same phone-digit rules, via validatePhone) the public lead-capture forms
 * use — not a second, admin-only implementation of the same idea. `loc` holds just the structured
 * sub-state those two components edit (LeadFormData is overkill here — it also has name/email/etc
 * fields this modal doesn't use through it — but reusing the shape is what lets composePhone /
 * composeCountryCity / resolveCountry / resolveCity be reused unchanged too). `draft` remains the
 * full SalesLead being edited; `loc` is folded back into it on save.
 *
 * Departments + Assigned to (LeadAssignmentFields) aren't part of the SalesLead row — they live in
 * sales_lead_departments / sales_lead_assignments — so they're held as a separate draft and handed
 * to `onSave` next to the lead, so one Save changes does everything.
 *
 * Every lead opens straight into edit mode (no "Edit lead" step). For an existing lead, "Save
 * changes" first shows SaveConfirmDialog listing what changed, so data arriving from the public
 * pages isn't overwritten by a stray edit; a new lead (Add new lead) saves without the warning.
 * Closing with unsaved edits asks before throwing them away.
 *
 * Saving does NOT close the window (same as EnsEnquiryDetailModal): it shows "Changes saved",
 * reloads its fields from the stored lead the parent hands back as `lead`, and re-reads Lead
 * activity so the entry the save just wrote is visible. A new lead becomes "Lead details" for the
 * lead just created. The window closes only on Close / Cancel / Escape / a click outside. */
export default function LeadFormModal({ lead, employees, departments, assignment, promotedCities, onClose, onSave }: {
  lead: SalesLead;
  employees: AssignableEmployee[];
  departments: DepartmentOption[];
  /** The lead's stored departments and people, if any. */
  assignment?: LeadAssignment;
  promotedCities: Record<string, string[]>;
  onClose: () => void;
  /** Saves the lead, then its assignment, and returns the stored lead. Throws with the message to show. */
  onSave: (lead: SalesLead, assignmentDraft: LeadAssignmentDraft, adminNote: string) => Promise<SalesLead>;
}) {
  const [draft, setDraft] = useState<SalesLead>(lead);
  const [assignmentDraft, setAssignmentDraft] = useState<LeadAssignmentDraft>(() => assignmentToDraft(assignment));
  // Conversation result: what the admin notes when moving the lead to Follow Up / Confirmed. Not a
  // column of the lead — the save logs it (and any status change) in the lead's history, where it
  // shows as an "Admin status update" in Lead activity. Same as an Expand North Star lead.
  const [adminNote, setAdminNote] = useState('');
  const takesNote = (['follow-up', 'confirmed'] as string[]).includes(statusFromSalesLead(draft.status));
  const noteToSave = takesNote ? adminNote.trim() : '';
  const [loc, setLoc] = useState<LeadFormData>(() => toLocationFormData(lead));
  // PhoneField validates straight after a code change, in the same tick — before `loc` has
  // re-rendered. Validating against this ref (always the latest loc) avoids a stale error.
  const locRef = useRef(loc);
  const [nameInvalid, setNameInvalid] = useState(false);
  // Next follow-up date: the admin's own date on the lead, compulsory on every lead type while the
  // lead is open (Pending / Follow Up) and not asked for once it is Confirmed / Not Interested (the
  // stored value is then left as it is). A newly picked date can't be in the past; an older one
  // already stored may stay, so an overdue lead can still have an unrelated detail corrected.
  const needsFollowUpDate = statusNeedsFollowUpDate(statusFromSalesLead(draft.status));
  const today = localToday();
  const [followUpDateError, setFollowUpDateError] = useState('');
  const [contactError, setContactError] = useState('');
  const [formMsg, setFormMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // Bumped after a save, so LeadActivityPanel re-reads the history.
  const [activityVersion, setActivityVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isNew = !lead.id;

  const originalLoc = toLocationFormData(lead);
  const assignmentDirty = !sameAssignmentDraft(assignmentDraft, assignmentToDraft(assignment));
  const changes = [
    ...(Object.keys(FIELD_LABELS) as (keyof SalesLead)[])
      .filter((k) => draft[k] !== lead[k])
      .map((k) => FIELD_LABELS[k] as string),
    ...(loc.phone !== originalLoc.phone ? ['Contact no.'] : []),
    ...(resolveCountry(loc) !== resolveCountry(originalLoc) ? ['Country'] : []),
    ...(resolveCity(loc) !== resolveCity(originalLoc) ? ['City'] : []),
    ...(noteToSave ? ['Conversation result'] : []),
    ...(assignmentDirty ? ['Departments / Assigned to'] : []),
  ];
  const dirty = changes.length > 0;

  function requestClose() {
    // Escape while the save warning is up only dismisses the warning.
    if (confirmOpen) { if (!saving) setConfirmOpen(false); return; }
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  }
  // Mounted only while this modal is open (parent renders it conditionally), so the listener
  // can just always be live.
  useEscapeKey(requestClose);

  // Which fields belong to this lead. A lead mirrored in from a public page only carries what that
  // page's form collects (see each module's to-sales-lead.ts), so — like the Expand North Star
  // window (EnsEnquiryDetailModal), which only ever shows its own page's fields — anything the page
  // doesn't collect is left out rather than shown empty or locked:
  //  - Event details: only the Sponsor an Event form collects them.
  //  - Company: every form except Sponsor an Event collects it.
  //  - Budget range + Campaign goal: only the Advertise With Us form collects them.
  //  - Tell us more: the optional box the Feature / Funding Round / Press Release / Advertise forms
  //    end with. Shown read-only — it is the visitor's own wording, and the server never updates
  //    it (see SalesTrackerRepository.upsertLead). Staff notes go in Conversation result instead.
  //  - Last call discussion: the hand-kept call note of a manually added lead. No page collects
  //    it (a page lead's follow-ups are the employee ones in LeadActivityPanel), so on a page lead
  //    it only shows if it already holds a value. (Next follow-up date is on every lead — see
  //    needsFollowUpDate. "Last connect date" was removed from the window on 2026-10-08; its column
  //    and stored values are kept, and a save passes the stored value through untouched.)
  //  - Source + Type of lead: set by the page itself — changing them would move the lead off that
  //    page's filter/KPI tile, so they're locked on an existing page lead.
  // Manually added leads keep everything editable (and, like other non-Sponsor leads, show no event section).
  const pageLabel = PAGE_LEAD_LABELS[lead.type] || '';
  const isPageLead = (PAGE_LEAD_TYPES as readonly string[]).includes(lead.type);
  const isSponsor = lead.type === 'Sponsor Event Page Leads';
  const isAdvertise = lead.type === 'Advertise Page Leads';
  const show = {
    company: !isSponsor,
    tellUsMore: TELL_US_MORE_LEAD_TYPES.includes(lead.type) || !!lead.tellUsMore,
    callLog: !isPageLead || !!lead.lastCallDiscussion,
  };
  const lock = {
    sourceType: isPageLead && !!lead.id,
  };
  const lockNote = (why: string) => <span className="lock-hint" title={why}><Lock size={11} aria-hidden />{why}</span>;

  function updateLoc(patch: Partial<LeadFormData>, revalidatePhone?: boolean) {
    const merged = { ...locRef.current, ...patch };
    const next = { ...merged, phone: composePhone(merged), countryCity: composeCountryCity(merged) };
    locRef.current = next;
    setLoc(next);
    if (revalidatePhone && contactError) setContactError(validatePhone(next));
  }

  function blurValidateContact() {
    setContactError(validatePhone(locRef.current));
  }

  /** Validates, then saves a new lead straight away or asks before overwriting an existing one. */
  function requestSave() {
    if (!draft.name.trim()) { setNameInvalid(true); setFormMsg({ kind: 'err', text: 'Name is required.' }); return; }
    setNameInvalid(false);
    const err = validatePhone(locRef.current);
    if (err) { setContactError(err); setFormMsg({ kind: 'err', text: 'Please enter a valid contact number.' }); return; }
    setContactError('');
    if (needsFollowUpDate) {
      const dateErr = !draft.nextFollowUpDate
        ? 'Please pick the next follow-up date.'
        : draft.nextFollowUpDate !== lead.nextFollowUpDate && draft.nextFollowUpDate < today
        ? 'The next follow-up date cannot be in the past.'
        : '';
      setFollowUpDateError(dateErr);
      if (dateErr) { setFormMsg({ kind: 'err', text: dateErr }); return; }
    }
    setFormMsg(null);
    if (isNew) void handleSave();
    else setConfirmOpen(true);
  }

  async function handleSave() {
    const l = locRef.current;
    const toSave: SalesLead = {
      ...draft,
      // lead.id covers a new lead whose first save stored it but then failed on the assignment.
      id: draft.id || lead.id || ('lead_' + Date.now()),
      name: draft.name.trim(),
      contact: composePhone(l),
      country: resolveCountry(l),
      city: resolveCity(l),
    };
    setSaving(true);
    try {
      const saved = await onSave(toSave, assignmentDraft, noteToSave);
      // Stay open on the stored lead: fields, phone / location parts and the note box start over
      // from what was saved, and Lead activity picks up the entry this save wrote.
      setDraft(saved);
      locRef.current = toLocationFormData(saved);
      setLoc(locRef.current);
      setAdminNote('');
      setContactError('');
      setActivityVersion((v) => v + 1);
      setFormMsg({ kind: 'ok', text: `Changes saved · last updated ${formatDateTime(saved.updatedAt)}` });
    } catch (err) {
      setFormMsg({ kind: 'err', text: err instanceof Error && err.message ? err.message : 'Could not save the lead. Try again.' });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isNew ? 'Add lead' : 'Lead details'}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={requestClose}><X size={20} aria-hidden /></button>
        </div>
        <div className="modal-body">
          {!isNew && (
            <div className="hint" style={{ marginBottom: 10 }}>Edit any detail below, then click <strong>Save changes</strong>. You&apos;ll be asked to confirm before anything is saved.</div>
          )}
          <div className={LEAD_FORM_GRID}>
            {/* Lead Creation Date — the day the lead came in (today for a new manual lead). Locked: the
                server also refuses to overwrite it on update (see SalesTrackerRepository.upsertLead). */}
            <div className="field"><label>Lead Creation Date {lockNote('Set when the lead was created')}</label><input type="date" value={draft.date} disabled readOnly /></div>
            {draft.id && (
              <div className="field">
                <label>Last updated {lockNote('Changes automatically when you save an edit')}</label>
                <input type="text" value={formatDateTime(draft.updatedAt)} disabled readOnly />
              </div>
            )}
            <div className="field"><label>Name <span style={{ color: 'var(--pink)' }}>*</span></label>
              <input type="text" className={nameInvalid ? 'invalid' : ''} placeholder="Lead's name" value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setNameInvalid(false); }} />
            </div>
            {show.company && (
              <div className="field"><label>Company name</label><input type="text" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></div>
            )}
            <div className="min-w-0">
              <PhoneField
                allowOtherCode
                id="lead-contact"
                label="Contact no."
                phoneCode={loc.phoneCode}
                phoneCodeCustom={loc.phoneCodeCustom}
                phoneNumber={loc.phoneNumber}
                error={contactError}
                onChangeCode={(v) => updateLoc({ phoneCode: v }, true)}
                onChangeCustomCode={(v) => updateLoc({ phoneCodeCustom: v }, true)}
                onChangeNumber={(v) => updateLoc({ phoneNumber: v }, true)}
                onBlurValidate={blurValidateContact}
              />
              {lead.contact && <a href={whatsappLink(lead.contact)} target="_blank" rel="noopener noreferrer" className="hint ic-text mt-1">Open in WhatsApp<ArrowUpRight size={12} aria-hidden /></a>}
            </div>
            <div className="field"><label>Email ID</label><input type="email" placeholder="name@company.com" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <CountryCityFields
              country={loc.country}
              countryOther={loc.countryOther}
              city={loc.city}
              cityOther={loc.cityOther}
              promotedCities={promotedCities}
              required={false}
              cityAsText
              onChangeCountry={(v) => updateLoc({ country: v })}
              onChangeCountryOther={(v) => updateLoc({ countryOther: v })}
              onChangeCity={(v) => updateLoc({ city: v })}
              onChangeCityOther={(v) => updateLoc({ cityOther: v })}
              onBlurCountry={() => {}}
              onBlurCity={() => {}}
            />
            <div className="field"><label>Source of lead {lock.sourceType && lockNote(`Set by the ${pageLabel} page`)}</label><input type="text" placeholder="IG handle, WhatsApp, email link..." value={draft.source} disabled={lock.sourceType} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></div>
            <div className="field"><label>Type of lead {lock.sourceType && lockNote(`Set by the ${pageLabel} page`)}</label>
              <select value={draft.type} disabled={lock.sourceType} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                {/* A lead mirrored in from a public form (see PAGE_LEAD_TYPES) carries a type
                    that's deliberately not in this list — it has its own "Filter: page leads"
                    dropdown instead. Falling back to TYPES[0] here on save would silently
                    overwrite that type, so the current value is always kept selectable even when
                    it's not one of the manual options. */}
                {(TYPES as readonly string[]).includes(draft.type) ? null : <option value={draft.type}>{draft.type}</option>}
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {draft.type === 'Others' && (
              <div className="field"><label>Specify type</label><input type="text" placeholder="Describe lead source" value={draft.otherType} onChange={(e) => setDraft({ ...draft, otherType: e.target.value })} /></div>
            )}
            <LeadAssignmentFields
              idPrefix="lead"
              employees={employees}
              departments={departments}
              assignment={assignment}
              value={assignmentDraft}
              onChange={setAssignmentDraft}
            />
            <div className="field"><label>Status</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {needsFollowUpDate && (
              <div className="field"><label htmlFor="lead-next-follow-up">Next follow-up date <span style={{ color: 'var(--pink)' }}>*</span></label>
                <input
                  id="lead-next-follow-up"
                  type="date"
                  min={today}
                  className={followUpDateError ? 'invalid' : ''}
                  aria-invalid={!!followUpDateError}
                  value={draft.nextFollowUpDate}
                  onChange={(e) => { setDraft({ ...draft, nextFollowUpDate: e.target.value }); setFollowUpDateError(''); }}
                />
                {followUpDateError
                  ? <div className="hint text-[var(--danger)]!" role="alert">{followUpDateError}</div>
                  : <div className="hint">Your own date. The lead shows in Today&apos;s Follow up on this day.</div>}
              </div>
            )}
            {show.callLog && (
              <div className="field"><label>Last call discussion</label><input type="text" placeholder="Notes from last call..." value={draft.lastCallDiscussion} onChange={(e) => setDraft({ ...draft, lastCallDiscussion: e.target.value })} /></div>
            )}
            {isAdvertise && (
              <>
                <div className="field"><label>Budget range</label><input type="text" placeholder="$5,000 – $10,000" value={draft.budgetRange} onChange={(e) => setDraft({ ...draft, budgetRange: e.target.value })} /></div>
                <div className="field"><label>Campaign goal</label><input type="text" placeholder="Brand awareness" value={draft.campaignGoal} onChange={(e) => setDraft({ ...draft, campaignGoal: e.target.value })} /></div>
              </>
            )}
            {show.tellUsMore && (
              <div className="field col-span-full">
                <label>Tell us more {lockNote(`Written by the visitor on the ${pageLabel || 'lead'} form`)}</label>
                {lead.tellUsMore
                  ? <div className="whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text)] max-h-60 overflow-y-auto">{lead.tellUsMore}</div>
                  : <div className="hint">The visitor left this box empty.</div>}
              </div>
            )}
            {/* Shown under Follow Up / Confirmed, like the Expand North Star window's. The old "Query
                description" box that sat here is gone from the form; the lead's stored query text is
                left as it is. */}
            {takesNote && (
              <div className="field col-span-full"><label htmlFor="lead-conversation-note">Conversation result</label>
                <textarea id="lead-conversation-note" maxLength={FOLLOW_UP_NOTE_MAX_LENGTH} placeholder="What happened on the call / chat, and what was agreed next" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                <div className="hint">Added to Lead activity below when you save · {adminNote.length} / {FOLLOW_UP_NOTE_MAX_LENGTH}</div>
              </div>
            )}
            {/* Event details — only a Sponsor an Event lead carries these (mirrored in full from
                sponsor_event_submissions, see to-sales-lead.ts, and editable here). Every other lead
                (the other page leads, manually added ones) has no event, so the section isn't shown. */}
            {isSponsor && (
              <>
                <div className="field col-span-full font-semibold text-[var(--pink-dark)]">
                  <span>Event details</span>
                </div>
                <div className="field"><label>Event title</label><input type="text" placeholder="Event title" value={draft.eventTitle} onChange={(e) => setDraft({ ...draft, eventTitle: e.target.value })} /></div>
                <div className="field"><label>Event URL / slug</label><input type="text" placeholder="event-slug" value={draft.eventSlug} onChange={(e) => setDraft({ ...draft, eventSlug: e.target.value })} /></div>
                <div className="field"><label>Event date</label><input type="date" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} /></div>
                <div className="field"><label>Event time</label><input type="time" value={draft.eventTime} onChange={(e) => setDraft({ ...draft, eventTime: e.target.value })} /></div>
                <div className="field min-[1200px]:col-span-2"><label>External URL</label><input type="url" placeholder="https://..." value={draft.externalUrl} onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} /></div>
                <div className="field min-[1200px]:col-span-2">
                  <label>Poster URL</label>
                  <input type="url" placeholder="https://..." value={draft.posterUrl} onChange={(e) => setDraft({ ...draft, posterUrl: e.target.value })} />
                  {draft.posterUrl && <a href={draft.posterUrl} target="_blank" rel="noopener noreferrer" className="hint ic-text" style={{ marginTop: 4 }}>View current poster<ArrowUpRight size={12} aria-hidden /></a>}
                </div>
                <div className="field col-span-full"><label>Event description</label><textarea placeholder="Event description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              </>
            )}
          </div>
          {/* Last, after every field: the lead's whole follow-up history in one timeline. */}
          <LeadActivityPanel source="lead" leadId={lead.id} refreshKey={activityVersion} />
          {formMsg && <div className={`msg ${formMsg.kind}`} role={formMsg.kind === 'err' ? 'alert' : 'status'}>{formMsg.text}</div>}
        </div>
        <div className="modal-actions">
          <button type="button" disabled={saving} onClick={requestClose}>{isNew ? 'Cancel' : 'Close'}</button>
          <button type="button" className="primary" disabled={saving || (!isNew && !dirty)} onClick={requestSave}>{saving ? 'Saving…' : isNew ? 'Save lead' : 'Save changes'}</button>
        </div>
      </div>
    </div>
    {confirmOpen && (
      <SaveConfirmDialog changes={changes} saving={saving} onCancel={() => setConfirmOpen(false)} onConfirm={() => void handleSave()} />
    )}
    </>
  );
}
