'use client';

import { useState } from 'react';
import CountryCodePicker from './CountryCodePicker';
import { CUSTOM_CODE_RE, PHONE_RULES, STATUSES, TYPES } from './constants';
import { parseContactValue } from './utils';
import type { SalesLead } from './types';

function validateContact(code: string, custom: string, number: string): string {
  const digits = number.replace(/\D/g, '');
  if (code === 'other' && custom.trim() && !CUSTOM_CODE_RE.test(custom.trim())) return 'Enter a valid country code (e.g. +123).';
  if (!digits) return '';
  const effectiveCode = code === 'other' ? (custom.trim() || 'other') : code;
  const rule = PHONE_RULES[effectiveCode] || PHONE_RULES.other;
  return rule.pattern.test(digits) ? '' : rule.message;
}

/** Add/edit lead modal — mount it fresh per open (parent renders it conditionally) so its
 * internal state always starts from the `lead` passed in, whether that's a blank draft or
 * an existing lead being edited. */
export default function LeadFormModal({ lead, team, onClose, onSave }: {
  lead: SalesLead;
  team: string[];
  onClose: () => void;
  onSave: (lead: SalesLead) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SalesLead>(lead);
  const parsedInitial = parseContactValue(lead.contact);
  const [contactCode, setContactCode] = useState(parsedInitial.code);
  const [contactCustomCode, setContactCustomCode] = useState(parsedInitial.custom);
  const [contactNumber, setContactNumber] = useState(parsedInitial.number);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [contactError, setContactError] = useState('');
  const [formMsg, setFormMsg] = useState<{ kind: 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!draft.name.trim()) { setNameInvalid(true); setFormMsg({ kind: 'err', text: 'Name is required.' }); return; }
    setNameInvalid(false);
    const err = validateContact(contactCode, contactCustomCode, contactNumber);
    if (err) { setContactError(err); setFormMsg({ kind: 'err', text: 'Please enter a valid contact number.' }); return; }
    setContactError('');
    const effectiveCode = contactCode === 'other' ? (contactCustomCode.trim() || 'other') : contactCode;
    const toSave: SalesLead = {
      ...draft,
      id: draft.id || ('lead_' + Date.now()),
      name: draft.name.trim(),
      contact: contactNumber.trim() ? `${effectiveCode} ${contactNumber.replace(/\D/g, '')}` : '',
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
            <div className="field"><label>Name <span style={{ color: 'var(--pink)' }}>*</span></label>
              <input type="text" className={nameInvalid ? 'invalid' : ''} placeholder="Lead's name" value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setNameInvalid(false); }} />
            </div>
            <div className="field"><label>Company name</label><input type="text" placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></div>
            <div className={`field${contactError ? ' has-error' : ''}`}>
              <label>Contact no.</label>
              <div className="phone-row">
                <CountryCodePicker value={contactCode} onChange={setContactCode} />
                {contactCode === 'other' && (
                  <input type="text" placeholder="+xxx" style={{ display: 'inline-block', maxWidth: 70, flex: '0 0 70px' }}
                    value={contactCustomCode} onChange={(e) => setContactCustomCode(e.target.value)}
                    onBlur={() => setContactError(validateContact(contactCode, contactCustomCode, contactNumber))} />
                )}
                <input type="tel" placeholder="e.g. 98765 43210" value={contactNumber}
                  onChange={(e) => { setContactNumber(e.target.value); if (contactError) setContactError(validateContact(contactCode, contactCustomCode, e.target.value)); }}
                  onBlur={() => setContactError(validateContact(contactCode, contactCustomCode, contactNumber))} />
              </div>
              <div className={`field-error${contactError ? ' visible' : ''}`}>{contactError}</div>
            </div>
          </div>
          <div className="row">
            <div className="field"><label>Email ID</label><input type="email" placeholder="name@company.com" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div className="field"><label>Source of lead</label><input type="text" placeholder="IG handle, WhatsApp, email link..." value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></div>
            <div className="field"><label>Type of lead</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
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
          <button className="primary" disabled={saving} onClick={handleSave}>{draft.id ? 'Update lead' : 'Save lead'}</button>
          <button onClick={onClose}>Cancel</button>
          {formMsg && <div className={`msg ${formMsg.kind}`}>{formMsg.text}</div>}
        </div>
      </div>
    </div>
  );
}
