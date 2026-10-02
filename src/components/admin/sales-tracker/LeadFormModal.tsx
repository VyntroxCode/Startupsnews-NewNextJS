'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Lock, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PhoneField } from '@/components/ui/PhoneField';
import { COUNTRY_CODE_OPTIONS } from '@/components/ui/constants/phone';
import { CountryCityFields } from '@/components/submit-event/CountryCityFields';
import { COUNTRIES, OTHER_CITY_VALUE } from '@/components/submit-event/constants';
import { canonicalCountryName, cityOptionsForCountry } from '@/modules/partnership-events/domain/country-city-data';
import { composeCountryCity, composePhone, resolveCity, resolveCountry } from '@/components/lead-forms/shared/compose';
import { createInitialLeadFormData, type LeadFormData } from '@/components/lead-forms/shared/types';
import { validatePhone } from '@/components/lead-forms/shared/validation';
import { type AssignableEmployee, assignmentToDraft, type DepartmentOption, type LeadAssignment, type LeadAssignmentDraft } from '@/modules/lead-assignments/domain/types';
import FollowUpsPanel from './FollowUpsPanel';
import LeadAssignmentFields from './LeadAssignmentFields';
import LeadMessagesPanel from './LeadMessagesPanel';
import { PAGE_LEAD_LABELS, PAGE_LEAD_TYPES, STATUSES, TYPES } from './constants';
import type { SalesLead } from './types';

const KNOWN_CODES = COUNTRY_CODE_OPTIONS.map((c) => c.code).filter((c) => c !== 'other');

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "+91 9876543210" back into the three inputs PhoneField edits. A code outside the dropdown's
 * list reopens under "Other" with the code in the free-text box, exactly as it was typed. */
function splitPhone(phone: string): Pick<LeadFormData, 'phoneCode' | 'phoneCodeCustom' | 'phoneNumber'> {
  const m = phone.trim().match(/^(\+\d{1,4})\s+(.*)$/);
  if (!m) return { phoneCode: '+91', phoneCodeCustom: '', phoneNumber: phone.replace(/\D/g, '') };
  const digits = m[2].replace(/\D/g, '');
  return KNOWN_CODES.includes(m[1])
    ? { phoneCode: m[1], phoneCodeCustom: '', phoneNumber: digits }
    : { phoneCode: 'other', phoneCodeCustom: m[1], phoneNumber: digits };
}

/** Stored country/city back into the dropdown state CountryCityFields expects. The country
 * dropdown has no "Other" row, so a stored value is matched to the list (aliases like
 * "United States" → "USA" via canonicalCountryName); a value that still isn't on the list is kept
 * on the draft untouched — the select shows its placeholder, and saving without re-picking leaves
 * the stored country exactly as it was. City keeps its "Other (add manually)" escape. */
function splitLocation(
  country: string,
  city: string,
  promotedCities: Record<string, string[]>
): Pick<LeadFormData, 'country' | 'countryOther' | 'city' | 'cityOther'> {
  let countryValue = '';
  if (country) {
    const canon = canonicalCountryName(country);
    const listed = COUNTRIES.find((c) => c === country || c.toLowerCase() === canon.toLowerCase());
    countryValue = listed ?? country;
  }
  const cities = countryValue ? cityOptionsForCountry(countryValue, promotedCities) ?? [] : [];
  let cityValue = '';
  let cityOther = '';
  if (city) {
    if (cities.includes(city)) cityValue = city;
    else { cityValue = OTHER_CITY_VALUE; cityOther = city; }
  } else if (countryValue && cities.length === 0) {
    cityValue = OTHER_CITY_VALUE;
  }
  return { country: countryValue, countryOther: '', city: cityValue, cityOther };
}

function toLocationFormData(lead: SalesLead, promotedCities: Record<string, string[]>): LeadFormData {
  const data = createInitialLeadFormData({
    ...splitPhone(lead.contact),
    ...splitLocation(lead.country, lead.city, promotedCities),
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
 * to `onSave` next to the lead. So is the new "Message for assigned employees" (LeadMessagesPanel,
 * sales_lead_messages), offered only once both are filled.
 *
 * An existing lead opens READ-ONLY: every control sits inside a disabled <fieldset>, and the phone
 * and country/city pickers (whose searchable dropdown doesn't honour a fieldset) are swapped for
 * plain read-only text. Nothing changes until the admin clicks "Edit lead"; Cancel then throws the
 * edits away and returns to the read-only view. Form data arriving from the public pages can no
 * longer be altered by a stray click. A new lead (Add new lead) opens straight into edit mode. */
export default function LeadFormModal({ lead, startEditing = false, employees, departments, assignment, promotedCities, onClose, onSave }: {
  lead: SalesLead;
  /** Open an existing lead already unlocked — the All leads table's Edit button. */
  startEditing?: boolean;
  employees: AssignableEmployee[];
  departments: DepartmentOption[];
  /** The lead's stored departments and people, if any. */
  assignment?: LeadAssignment;
  promotedCities: Record<string, string[]>;
  onClose: () => void;
  /** `message` is the new "Message for assigned employees", already trimmed — '' when there's none
   * or the lead has no departments + people to send it to. */
  onSave: (lead: SalesLead, assignmentDraft: LeadAssignmentDraft, message: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SalesLead>(lead);
  const [assignmentDraft, setAssignmentDraft] = useState<LeadAssignmentDraft>(() => assignmentToDraft(assignment));
  const [messageDraft, setMessageDraft] = useState('');
  const canMessage = assignmentDraft.departments.length > 0 && assignmentDraft.assignees.length > 0;
  const [loc, setLoc] = useState<LeadFormData>(() => toLocationFormData(lead, promotedCities));
  // PhoneField validates straight after a code change, in the same tick — before `loc` has
  // re-rendered. Validating against this ref (always the latest loc) avoids a stale error.
  const locRef = useRef(loc);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [contactError, setContactError] = useState('');
  const [formMsg, setFormMsg] = useState<{ kind: 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !lead.id;
  const [editing, setEditing] = useState(isNew || startEditing);
  // Mounted only while this modal is open (parent renders it conditionally), so the listener
  // can just always be live.
  useEscapeKey(onClose);

  // Which fields belong to this lead. A lead mirrored in from a public page only carries what that
  // page's form collects (see each module's to-sales-lead.ts), so everything else is shown but
  // locked instead of inviting data the lead never had:
  //  - Event details: only the Sponsor an Event form collects them, so the section is only rendered
  //    for those leads (hidden, not locked, everywhere else).
  //  - Company: every form except Sponsor an Event collects it.
  //  - Source + Type of lead: set by the page itself — changing them would move the lead off that
  //    page's filter/KPI tile, so they're locked on an existing page lead.
  // Manually added leads keep everything editable (and, like other non-Sponsor leads, show no event section).
  const pageLabel = PAGE_LEAD_LABELS[lead.type] || '';
  const isPageLead = (PAGE_LEAD_TYPES as readonly string[]).includes(lead.type);
  const isSponsor = lead.type === 'Sponsor Event Page Leads';
  const lock = {
    company: isSponsor,
    sourceType: isPageLead && !!lead.id,
  };
  const lockNote = (why: string) => <span className="lock-hint" title={why}><Lock size={11} aria-hidden />{why}</span>;
  const notCollected = pageLabel ? `Not collected by ${pageLabel}` : 'Not used for this lead';

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

  /** Back to the read-only view with the lead exactly as it was opened — or, for a new lead that
   * has nothing to go back to, close the window. */
  function cancelEdit() {
    if (isNew) { onClose(); return; }
    const original = toLocationFormData(lead, promotedCities);
    locRef.current = original;
    setLoc(original);
    setDraft(lead);
    setAssignmentDraft(assignmentToDraft(assignment));
    setMessageDraft('');
    setNameInvalid(false);
    setContactError('');
    setFormMsg(null);
    setEditing(false);
  }

  async function handleSave() {
    if (!draft.name.trim()) { setNameInvalid(true); setFormMsg({ kind: 'err', text: 'Name is required.' }); return; }
    setNameInvalid(false);
    const err = validatePhone(locRef.current);
    if (err) { setContactError(err); setFormMsg({ kind: 'err', text: 'Please enter a valid contact number.' }); return; }
    setContactError('');
    const l = locRef.current;
    const toSave: SalesLead = {
      ...draft,
      id: draft.id || ('lead_' + Date.now()),
      name: draft.name.trim(),
      contact: composePhone(l),
      country: resolveCountry(l),
      city: resolveCity(l),
    };
    setSaving(true);
    try {
      await onSave(toSave, assignmentDraft, canMessage ? messageDraft.trim() : '');
    } catch (err) {
      setFormMsg({ kind: 'err', text: err instanceof Error && err.message ? err.message : 'Could not save the lead. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2>{isNew ? 'Add lead' : editing ? 'Edit lead' : 'Lead details'}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}><X size={20} aria-hidden /></button>
        </div>
        <div className="modal-body">
          {!editing && (
            <div className="hint" style={{ marginBottom: 10 }}><Lock size={12} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />Read-only. Click <strong>Edit lead</strong> to change any detail.</div>
          )}
          <fieldset disabled={!editing} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className="row">
            {/* Arrival date — the day the lead came in (today for a new manual lead). Locked: the server
                also refuses to overwrite it on update (see SalesTrackerRepository.upsertLead). */}
            <div className="field"><label>Arrival date {lockNote('Set when the lead arrived')}</label><input type="date" value={draft.date} disabled readOnly /></div>
            {draft.id && (
              <div className="field">
                <label>Last updated {lockNote('Changes automatically when you save an edit')}</label>
                <input type="text" value={formatDateTime(draft.updatedAt)} disabled readOnly />
              </div>
            )}
            <div className="field"><label>Name <span style={{ color: 'var(--pink)' }}>*</span></label>
              <input type="text" className={nameInvalid ? 'invalid' : ''} placeholder="Lead's name" value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setNameInvalid(false); }} />
            </div>
            <div className="field"><label>Company name {lock.company && lockNote(notCollected)}</label><input type="text" placeholder={lock.company ? '—' : 'Company'} value={draft.company} disabled={lock.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></div>
          </div>
          <div className="row">
            {/* flex-grow:0 with a fixed basis, not the generic .field's flex:1 — alone (or paired
                with just Email) in an 80vw-wide modal row, a growing field would stretch the phone
                number input to an absurd width. min-width still gives the country-code picker +
                number room to lay out without wrapping oddly. */}
            <div style={{ flex: '0 1 360px', minWidth: 300 }}>
              {editing ? (
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
              ) : (
                <div className="field"><label>Contact no.</label><input type="text" value={loc.phone} placeholder="—" disabled readOnly /></div>
              )}
            </div>
            <div className="field"><label>Email ID</label><input type="email" placeholder="name@company.com" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
          </div>
          <div className="row">
            {editing ? (
            <CountryCityFields
              country={loc.country}
              countryOther={loc.countryOther}
              city={loc.city}
              cityOther={loc.cityOther}
              promotedCities={promotedCities}
              required={false}
              onChangeCountry={(v) => updateLoc({ country: v })}
              onChangeCountryOther={(v) => updateLoc({ countryOther: v })}
              onChangeCity={(v) => updateLoc({ city: v })}
              onChangeCityOther={(v) => updateLoc({ cityOther: v })}
              onBlurCountry={() => {}}
              onBlurCity={() => {}}
            />
            ) : (
              <>
                <div className="field"><label>Country</label><input type="text" value={resolveCountry(loc)} placeholder="—" disabled readOnly /></div>
                <div className="field"><label>City</label><input type="text" value={resolveCity(loc)} placeholder="—" disabled readOnly /></div>
              </>
            )}
          </div>
          <div className="row">
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
          </div>
          <LeadAssignmentFields
            idPrefix="lead"
            employees={employees}
            departments={departments}
            assignment={assignment}
            value={assignmentDraft}
            onChange={setAssignmentDraft}
          />
          <LeadMessagesPanel
            idPrefix="lead"
            source="lead"
            leadId={lead.id}
            editing={editing}
            canWrite={canMessage}
            value={messageDraft}
            onChange={setMessageDraft}
          />
          <div className="row">
            <div className="field"><label>Status</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field"><label>Next follow-up date</label><input type="date" value={draft.nextFollowUpDate} onChange={(e) => setDraft({ ...draft, nextFollowUpDate: e.target.value })} /></div>
            <div className="field"><label>Last connect date</label><input type="date" value={draft.lastConnectDate} onChange={(e) => setDraft({ ...draft, lastConnectDate: e.target.value })} /></div>
            <div className="field"><label>Last call discussion</label><input type="text" placeholder="Notes from last call..." value={draft.lastCallDiscussion} onChange={(e) => setDraft({ ...draft, lastCallDiscussion: e.target.value })} /></div>
          </div>
          <div className="row">
            <div className="field" style={{ flexBasis: '100%' }}><label>Query description</label><textarea placeholder="Details of the query" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></div>
          </div>
          {/* Event details — only a Sponsor an Event lead carries these (mirrored in full from
              sponsor_event_submissions, see to-sales-lead.ts, and editable here). Every other lead
              (the other page leads, manually added ones) has no event, so the section isn't shown. */}
          {isSponsor && (
            <>
              <div className="row" style={{ marginTop: 4 }}>
                <div className="field" style={{ flexBasis: '100%', fontWeight: 600, color: 'var(--pink-dark)' }}>
                  <span>Event details</span>
                </div>
              </div>
              <div className="row">
                <div className="field"><label>Event title</label><input type="text" placeholder="Event title" value={draft.eventTitle} onChange={(e) => setDraft({ ...draft, eventTitle: e.target.value })} /></div>
                <div className="field"><label>Event URL / slug</label><input type="text" placeholder="event-slug" value={draft.eventSlug} onChange={(e) => setDraft({ ...draft, eventSlug: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="field"><label>Event date</label><input type="date" value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} /></div>
                <div className="field"><label>Event time</label><input type="time" value={draft.eventTime} onChange={(e) => setDraft({ ...draft, eventTime: e.target.value })} /></div>
                <div className="field"><label>External URL</label><input type="url" placeholder="https://..." value={draft.externalUrl} onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="field" style={{ flexBasis: '100%' }}>
                  <label>Poster URL</label>
                  <input type="url" placeholder="https://..." value={draft.posterUrl} onChange={(e) => setDraft({ ...draft, posterUrl: e.target.value })} />
                  {draft.posterUrl && <a href={draft.posterUrl} target="_blank" rel="noopener noreferrer" className="hint ic-text" style={{ marginTop: 4 }}>View current poster<ArrowUpRight size={12} aria-hidden /></a>}
                </div>
              </div>
              <div className="row">
                <div className="field" style={{ flexBasis: '100%' }}><label>Event description</label><textarea placeholder="Event description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              </div>
            </>
          )}
          </fieldset>
          {/* Outside the fieldset: read-only either way, and its content isn't part of this form. */}
          {!isNew && <FollowUpsPanel source="lead" leadId={lead.id} />}
          {formMsg && <div className={`msg ${formMsg.kind}`}>{formMsg.text}</div>}
        </div>
        <div className="modal-actions">
          {editing ? (
            <>
              <button type="button" disabled={saving} onClick={cancelEdit}>Cancel</button>
              <button type="button" className="primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : isNew ? 'Save lead' : 'Update lead'}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose}>Close</button>
              <button type="button" className="primary" onClick={() => setEditing(true)}>Edit lead</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
