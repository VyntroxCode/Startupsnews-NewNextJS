'use client';

import { useEffect, useState } from 'react';
import type { EnsTravelEnquiry, EnsTravelEnquiryAdminInput } from '@/modules/ens-travel-enquiries/domain/types';
import {
  CONVERSATION_NOTE_MAX_LENGTH,
  LEAD_STATUS_FOLLOWED_UP,
  LEAD_STATUS_OPTIONS,
  leadStatusLabel,
  NO_STATUS_LABEL,
} from '@/modules/ens-travel-enquiries/domain/lead-status';
import {
  PACKAGE_INCLUSIONS,
  packageFor,
  PARTICIPATION_OPTIONS,
  PARTICIPATION_OTHERS,
  participationLabel,
  REQUIREMENT_MAX_LENGTH,
} from '@/modules/ens-travel-enquiries/domain/participation';
import {
  FOUND_US_DETAIL_MAX_LENGTH,
  FOUND_US_OPTIONS,
  FOUND_US_OTHERS,
  foundUsLabel,
  NO_REFERRER_LABEL,
  REFERRED_BY_OPTIONS,
  referredByLabel,
} from '@/modules/ens-travel-enquiries/domain/sources';
import { COUNTRY_NAMES } from '@/modules/partnership-events/domain/country-city-data';
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

/** The lead-status pill: one tone per status, and a muted one for "no conversation yet". */
export function leadStatusBadge(status: EnsTravelEnquiry['leadStatus']): { label: string; tone: string } {
  return { label: leadStatusLabel(status), tone: status ?? 'none' };
}

/** Which of the page's two packages an option belongs to, as a short badge label. */
export function participationBadge(value: string): { label: string; tone: 'delegate' | 'booth' | 'others' } {
  const pack = packageFor(value);
  if (pack === 'delegate') return { label: participationLabel(value), tone: 'delegate' };
  if (pack === 'booth') return { label: participationLabel(value), tone: 'booth' };
  return { label: 'Others', tone: 'others' };
}

/** One /expand-north-star enquiry, in full, with editing.
 *
 * View: who they are and how to reach them, where they're travelling from, how they're taking part
 * — with that package's inclusions, exactly as the public page lists them, or the requirement they
 * wrote under "Others" — and the record's own dates: when it was submitted and when an admin last
 * edited it (and who).
 *
 * Edit: the same fields the visitor filled, checked by the same rules server-side, plus the team's
 * own record of the conversation — a Lead status (Confirmed / Followed Up / Cancelled, or none yet)
 * and, under Followed Up, a note on what the conversation led to. Saving stamps "Last updated" and
 * switches back to the view showing the saved record. These enquiries have no row in All leads;
 * this dialog is where they are worked. */
export default function EnsEnquiryDetailModal({ enquiry, onClose, onSaved }: {
  enquiry: EnsTravelEnquiry;
  onClose: () => void;
  onSaved: (updated: EnsTravelEnquiry) => void;
}) {
  const [current, setCurrent] = useState(enquiry);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EnsTravelEnquiryAdminInput>(() => toInput(enquiry));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(toInput(current));

  function requestClose() {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function startEdit() {
    setDraft(toInput(current));
    setMsg(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload: EnsTravelEnquiryAdminInput = {
        ...draft,
        requirement: draft.participation === PARTICIPATION_OTHERS ? draft.requirement : '',
        foundUsDetail: draft.foundUs === FOUND_US_OTHERS ? draft.foundUsDetail : '',
        conversationNote: draft.leadStatus === LEAD_STATUS_FOLLOWED_UP ? draft.conversationNote : '',
      };
      const saved = await updateEnsEnquiry(current.id, payload);
      setCurrent(saved);
      onSaved(saved);
      setEditing(false);
      setMsg({ kind: 'ok', text: `Changes saved · last updated ${formatSubmittedOn(saved.updatedAt ?? undefined)}` });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : "Couldn't save the changes" });
    } finally {
      setSaving(false);
    }
  }

  const e = current;
  const badge = participationBadge(e.participation);
  const pack = packageFor(e.participation);
  const statusBadge = leadStatusBadge(e.leadStatus);
  const set = <K extends keyof EnsTravelEnquiryAdminInput>(key: K, value: EnsTravelEnquiryAdminInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const replySubject = encodeURIComponent('Your Expand North Star enquiry — StartupNews.fyi');

  return (
    <div className="modal-overlay" onClick={requestClose}>
      <div className="modal-box ee-modal" role="dialog" aria-modal="true" aria-labelledby="ee-modal-title" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-head">
          <h2 id="ee-modal-title">{editing ? `Edit enquiry — ${e.name}` : e.name}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={requestClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-meta">Expand North Star enquiry · ID {e.id}</div>

          {/* The record's two dates, always visible above both the view and the form. */}
          <div className="ee-dates">
            <div className="ee-date">
              <span className="ee-date-lbl">Received on</span>
              <span className="ee-date-val">{formatSubmittedOn(e.createdAt)}</span>
              <span className="hint">Submitted from /expand-north-star</span>
            </div>
            <div className={`ee-date${e.updatedAt ? ' is-edited' : ''}`}>
              <span className="ee-date-lbl">Last updated</span>
              <span className="ee-date-val">{e.updatedAt ? formatSubmittedOn(e.updatedAt) : 'Never edited'}</span>
              <span className="hint">{e.updatedAt ? `by ${e.updatedBy || 'an admin'}` : 'Shows the time of the last admin edit'}</span>
            </div>
          </div>

          {msg && <div className={`msg ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>{msg.text}</div>}

          {!editing ? (
            <div className="ee-panels">
              <section className="ee-panel">
                <header className="ee-panel-head">
                  <h3>Contact</h3>
                  <span>Who they are and how to reach them</span>
                </header>
                <dl className="ee-panel-kv">
                  <dt>Full name</dt><dd>{e.name}</dd>
                  <dt>Email</dt><dd><a href={`mailto:${e.email}`}>{e.email}</a></dd>
                  <dt>Contact number</dt>
                  <dd>
                    <a href={`tel:${e.contact.replace(/\s+/g, '')}`}>{e.contact}</a>
                    {' · '}
                    <a href={whatsappLink(e.contact)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
                  </dd>
                </dl>
              </section>

              <section className="ee-panel">
                <header className="ee-panel-head">
                  <h3>Travelling from</h3>
                  <span>Where they will be coming from</span>
                </header>
                <dl className="ee-panel-kv">
                  <dt>City</dt><dd>{e.city}</dd>
                  <dt>Country</dt><dd>{e.country}</dd>
                </dl>
              </section>

              <section className={`ee-panel is-${badge.tone}`}>
                <header className="ee-panel-head">
                  <h3>Participating as</h3>
                  <span>{pack ? 'Package they asked about' : 'Their own requirement'}</span>
                </header>
                <p className="ee-package-name">{participationLabel(e.participation)}</p>
                {pack ? (
                  <>
                    <p className="ee-package-sub">{pack === 'delegate' ? 'Delegation' : 'Booth / POD'} inclusions</p>
                    <ul className="ee-inclusions">
                      {PACKAGE_INCLUSIONS[pack].map((item) => (
                        <li key={item.text} className={item.highlight ? 'is-highlight' : undefined}>{item.text}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="ee-package-sub">Requirement</p>
                    <p className="se-desc">{e.requirement || <span className="hint">Not provided</span>}</p>
                  </>
                )}
              </section>

              <section className="ee-panel">
                <header className="ee-panel-head">
                  <h3>Source</h3>
                  <span>Who sent them, and where they found the event</span>
                </header>
                <dl className="ee-panel-kv">
                  <dt>Referred by</dt><dd>{e.referredBy ? referredByLabel(e.referredBy) : <span className="hint">{NO_REFERRER_LABEL}</span>}</dd>
                  <dt>How they found us</dt><dd>{foundUsLabel(e.foundUs)}</dd>
                  {e.foundUs === FOUND_US_OTHERS && (
                    <><dt>In their words</dt><dd>{e.foundUsDetail || <span className="hint">Not provided</span>}</dd></>
                  )}
                </dl>
              </section>

              <section className={`ee-panel is-status-${statusBadge.tone}`}>
                <header className="ee-panel-head">
                  <h3>Conversation</h3>
                  <span>Where the team’s conversation with this lead stands</span>
                </header>
                <div className="ee-status-row">
                  <span className="ee-status-lbl">Lead status</span>
                  <span className={`badge ee-status is-${statusBadge.tone}`}>{statusBadge.label}</span>
                </div>
                {e.leadStatus === LEAD_STATUS_FOLLOWED_UP ? (
                  <>
                    <p className="ee-package-sub">Conversation result</p>
                    <p className="se-desc">{e.conversationNote || <span className="hint">No note written yet — use Edit details to add what the conversation led to.</span>}</p>
                  </>
                ) : (
                  <p className="ee-panel-note">
                    {e.leadStatus === null
                      ? 'Nobody has logged a conversation with this lead yet. Use Edit details to set a status once you have spoken to them.'
                      : e.leadStatus === 'confirmed'
                        ? 'This lead has confirmed. No further conversation note is kept for confirmed leads.'
                        : 'This lead has been cancelled. No further conversation note is kept for cancelled leads.'}
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="ee-form">
              <div className="row">
                <div className="field">
                  <label htmlFor="ee-name">Full name <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <input id="ee-name" type="text" maxLength={120} value={draft.name} onChange={(ev) => set('name', ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ee-email">Email <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <input id="ee-email" type="email" maxLength={160} value={draft.email} onChange={(ev) => set('email', ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ee-contact">Contact number <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <input id="ee-contact" type="tel" maxLength={24} placeholder="+91 9876543210" value={draft.contact} onChange={(ev) => set('contact', ev.target.value)} />
                  <div className="hint">With the country code, e.g. +971 501234567</div>
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="ee-city">City <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <input id="ee-city" type="text" maxLength={120} value={draft.city} onChange={(ev) => set('city', ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ee-country">Country <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <input id="ee-country" type="text" maxLength={120} list="ee-country-list" value={draft.country} onChange={(ev) => set('country', ev.target.value)} />
                  <datalist id="ee-country-list">
                    {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="ee-participation">Participating as <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <select id="ee-participation" value={draft.participation} onChange={(ev) => set('participation', ev.target.value as EnsTravelEnquiryAdminInput['participation'])}>
                    {PARTICIPATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              {draft.participation === PARTICIPATION_OTHERS && (
                <div className="row">
                  <div className="field" style={{ flexBasis: '100%' }}>
                    <label htmlFor="ee-requirement">Requirement <span style={{ color: 'var(--pink)' }}>*</span></label>
                    <textarea id="ee-requirement" maxLength={REQUIREMENT_MAX_LENGTH} value={draft.requirement} onChange={(ev) => set('requirement', ev.target.value)} />
                    <div className="hint">{draft.requirement.length} / {REQUIREMENT_MAX_LENGTH}</div>
                  </div>
                </div>
              )}

              <div className="ee-form-divider">Source</div>
              <div className="row">
                <div className="field">
                  <label htmlFor="ee-referred-by">Referred by</label>
                  <select
                    id="ee-referred-by"
                    value={draft.referredBy}
                    onChange={(ev) => set('referredBy', ev.target.value as EnsTravelEnquiryAdminInput['referredBy'])}
                  >
                    <option value="">{NO_REFERRER_LABEL}</option>
                    {REFERRED_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="hint">The partner organisation that sent them, if any</div>
                </div>
                <div className="field">
                  <label htmlFor="ee-found-us">How they found us <span style={{ color: 'var(--pink)' }}>*</span></label>
                  <select
                    id="ee-found-us"
                    value={draft.foundUs}
                    onChange={(ev) => set('foundUs', ev.target.value as EnsTravelEnquiryAdminInput['foundUs'])}
                  >
                    {FOUND_US_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {draft.foundUs === FOUND_US_OTHERS && (
                  <div className="field">
                    <label htmlFor="ee-found-us-detail">In their words <span style={{ color: 'var(--pink)' }}>*</span></label>
                    <input id="ee-found-us-detail" type="text" maxLength={FOUND_US_DETAIL_MAX_LENGTH} value={draft.foundUsDetail} onChange={(ev) => set('foundUsDetail', ev.target.value)} />
                    <div className="hint">{draft.foundUsDetail.length} / {FOUND_US_DETAIL_MAX_LENGTH}</div>
                  </div>
                )}
              </div>

              <div className="ee-form-divider">Conversation</div>
              <div className="row">
                <div className="field">
                  <label htmlFor="ee-lead-status">Lead status</label>
                  <select
                    id="ee-lead-status"
                    value={draft.leadStatus ?? ''}
                    onChange={(ev) => set('leadStatus', (ev.target.value || null) as EnsTravelEnquiryAdminInput['leadStatus'])}
                  >
                    <option value="">{NO_STATUS_LABEL}</option>
                    {LEAD_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <div className="hint">How the conversation with this lead stands</div>
                </div>
              </div>
              {draft.leadStatus === LEAD_STATUS_FOLLOWED_UP && (
                <div className="row">
                  <div className="field" style={{ flexBasis: '100%' }}>
                    <label htmlFor="ee-conversation-note">Conversation result</label>
                    <textarea
                      id="ee-conversation-note"
                      maxLength={CONVERSATION_NOTE_MAX_LENGTH}
                      placeholder="What happened on the call / chat, and what was agreed next"
                      value={draft.conversationNote}
                      onChange={(ev) => set('conversationNote', ev.target.value)}
                    />
                    <div className="hint">{draft.conversationNote.length} / {CONVERSATION_NOTE_MAX_LENGTH}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {!editing ? (
            <>
              <button type="button" onClick={requestClose}>Close</button>
              <a className="se-btn-link ee-btn-ghost" href={`mailto:${e.email}?subject=${replySubject}`}>Reply by email</a>
              <button type="button" className="primary" onClick={startEdit}>Edit details</button>
            </>
          ) : (
            <>
              <button type="button" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button type="button" className="primary" onClick={() => void save()} disabled={saving || !dirty}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
