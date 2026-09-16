'use client';

import { useRef, useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PhoneField } from '@/components/ui/PhoneField';
import { COUNTRY_CODE_OPTIONS } from '@/components/ui/constants/phone';
import { CountryCityFields } from '@/components/submit-event/CountryCityFields';
import { COUNTRIES, OTHER_CITY_VALUE, OTHER_COUNTRY_VALUE } from '@/components/submit-event/constants';
import { cityOptionsForCountry } from '@/modules/partnership-events/domain/country-city-data';
import { composeCountryCity, composePhone, resolveCity, resolveCountry } from '@/components/lead-forms/shared/compose';
import { createInitialLeadFormData, type LeadFormData } from '@/components/lead-forms/shared/types';
import { validatePhone } from '@/components/lead-forms/shared/validation';
import { STATUSES, TYPES } from './constants';
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

/** Stored country/city back into the dropdown state CountryCityFields expects: a value on the
 * list is selected, anything else reopens under "Other (add manually)" with the text filled in. */
function splitLocation(
  country: string,
  city: string,
  promotedCities: Record<string, string[]>
): Pick<LeadFormData, 'country' | 'countryOther' | 'city' | 'cityOther'> {
  let countryValue = '';
  let countryOther = '';
  if (country) {
    if (COUNTRIES.includes(country)) countryValue = country;
    else { countryValue = OTHER_COUNTRY_VALUE; countryOther = country; }
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
  return { country: countryValue, countryOther, city: cityValue, cityOther };
}

function toLocationFormData(lead: SalesLead, promotedCities: Record<string, string[]>): LeadFormData {
  const data = createInitialLeadFormData({
    ...splitPhone(lead.contact),
    ...splitLocation(lead.country, lead.city, promotedCities),
  });
  return { ...data, phone: composePhone(data), countryCity: composeCountryCity(data) };
}

/** Add/edit lead modal — mount it fresh per open (parent renders it conditionally) so its
 * internal state always starts from the `lead` passed in, whether that's a blank draft or
 * an existing lead being edited.
 *
 * The Contact no. and Country/City fields are the very same PhoneField / CountryCityFields
 * components (and the same phone-digit rules, via validatePhone) the public lead-capture forms
 * use — not a second, admin-only implementation of the same idea. `loc` holds just the structured
 * sub-state those two components edit (LeadFormData is overkill here — it also has name/email/etc
 * fields this modal doesn't use through it — but reusing the shape is what lets composePhone /
 * composeCountryCity / resolveCountry / resolveCity be reused unchanged too). `draft` remains the
 * full SalesLead being edited; `loc` is folded back into it on save. */
export default function LeadFormModal({ lead, team, promotedCities, onClose, onSave }: {
  lead: SalesLead;
  team: string[];
  promotedCities: Record<string, string[]>;
  onClose: () => void;
  onSave: (lead: SalesLead) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SalesLead>(lead);
  const [loc, setLoc] = useState<LeadFormData>(() => toLocationFormData(lead, promotedCities));
  // PhoneField validates straight after a code change, in the same tick — before `loc` has
  // re-rendered. Validating against this ref (always the latest loc) avoids a stale error.
  const locRef = useRef(loc);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [contactError, setContactError] = useState('');
  const [formMsg, setFormMsg] = useState<{ kind: 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // Mounted only while this modal is open (parent renders it conditionally), so the listener
  // can just always be live.
  useEscapeKey(onClose);

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
      await onSave(toSave);
    } catch {
      setFormMsg({ kind: 'err', text: 'Could not save the lead. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2>{draft.id ? 'Edit lead' : 'Add lead'}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="row">
            <div className="field"><label>Date</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
            {draft.id && (
              <div className="field">
                <label>Last updated</label>
                <input type="text" value={formatDateTime(draft.updatedAt)} disabled readOnly />
              </div>
            )}
            <div className="field"><label>Name <span style={{ color: 'var(--pink)' }}>*</span></label>
              <input type="text" className={nameInvalid ? 'invalid' : ''} placeholder="Lead's name" value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setNameInvalid(false); }} />
            </div>
            <div className="field"><label>Company name</label><input type="text" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></div>
          </div>
          <div className="row">
            {/* flex-grow:0 with a fixed basis, not the generic .field's flex:1 — alone (or paired
                with just Email) in an 80vw-wide modal row, a growing field would stretch the phone
                number input to an absurd width. min-width still gives the country-code picker +
                number room to lay out without wrapping oddly. */}
            <div style={{ flex: '0 1 360px', minWidth: 300 }}>
              <PhoneField
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
            </div>
            <div className="field"><label>Email ID</label><input type="email" placeholder="name@company.com" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
          </div>
          <div className="row">
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
          </div>
          <div className="row">
            <div className="field"><label>Source of lead</label><input type="text" placeholder="IG handle, WhatsApp, email link..." value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></div>
            <div className="field"><label>Type of lead</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
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
          <div className="row">
            <div className="field"><label>Assigned to</label>
              <select value={draft.assignedTo} onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}>
                <option value="">Unassigned</option>
                {team.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
          {formMsg && <div className={`msg ${formMsg.kind}`}>{formMsg.text}</div>}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : draft.id ? 'Update lead' : 'Save lead'}</button>
        </div>
      </div>
    </div>
  );
}
