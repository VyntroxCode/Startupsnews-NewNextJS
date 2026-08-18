'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import HireEmployeeButton from './HireEmployeeButton';
import { StatusBadge, agreementMerged, daysLeft, downloadDoc, initials, pendingEmployeeDocUpdates, STAGE_LABEL } from '../utils';
import type { HrOnboarding } from '../types';

function PageHead() {
  const { state } = useHrTool();
  return (
    <div className="topbar">
      <div><h1 className="page-title">Onboarding</h1><div className="page-sub">Offer letter → e-signature → document upload → HR approval → Employment Agreement (preview, then sign) → Active.</div></div>
      <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
    </div>
  );
}

interface RejectTarget { kind: 'doc' | 'empDoc'; onboardingId?: string; empId?: string; idx: number; }

export default function Onboarding() {
  const { state, persistOnboarding, persistEmployees } = useHrTool();
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [agreementPreviewId, setAgreementPreviewId] = useState<string | null>(null);

  async function docAction(oid: string, idx: number, status: 'approved' | 'rejected') {
    if (status === 'rejected') { setRejectTarget({ kind: 'doc', onboardingId: oid, idx }); setRejectRemarks(''); return; }
    await persistOnboarding(state.onboarding.map((o) => (o.id === oid ? { ...o, docs: o.docs.map((d, i) => (i === idx ? { ...d, status: 'approved' } : d)) } : o)));
  }
  async function empDocAction(empId: string, idx: number, status: 'approved' | 'rejected') {
    if (status === 'rejected') { setRejectTarget({ kind: 'empDoc', empId, idx }); setRejectRemarks(''); return; }
    await persistEmployees(state.employees.map((e) => (e.id === empId ? { ...e, documents: e.documents.map((d, i) => (i === idx ? { ...d, status: 'approved' } : d)) } : e)));
  }
  async function confirmReject() {
    if (!rejectTarget || !rejectRemarks.trim()) { alert('Remarks are required on rejection.'); return; }
    if (rejectTarget.kind === 'doc') {
      await persistOnboarding(state.onboarding.map((o) => (o.id === rejectTarget.onboardingId ? { ...o, docs: o.docs.map((d, i) => (i === rejectTarget.idx ? { ...d, status: 'rejected' } : d)) } : o)));
    } else {
      await persistEmployees(state.employees.map((e) => (e.id === rejectTarget.empId ? { ...e, documents: e.documents.map((d, i) => (i === rejectTarget.idx ? { ...d, status: 'rejected' } : d)) } : e)));
    }
    setRejectTarget(null);
  }

  async function draftAgreement(oid: string) {
    await persistOnboarding(state.onboarding.map((o) => (o.id === oid ? { ...o, agreementStage: 'pending_employee_signature' } : o)));
    setAgreementPreviewId(null);
  }
  async function employerSignAgreement(oid: string) {
    const o = state.onboarding.find((x) => x.id === oid);
    if (!o) return;
    await persistOnboarding(state.onboarding.map((x) => (x.id === oid ? { ...x, agreementStage: 'signed' } : x)));
    const emp = state.employees.find((e) => e.id === o.employeeId);
    if (emp) {
      const content = agreementMerged(o, state.employees, state.templates, state.rules);
      await persistEmployees(state.employees.map((e) => (e.id === emp.id ? { ...e, signedDocs: [...(e.signedDocs || []), { type: 'Employment Agreement', content, signedDate: o.signedDate || '' }] } : e)));
    }
  }
  async function toggleAsset(oid: string, key: 'laptop' | 'idCard' | 'accessCard', val: boolean) {
    await persistOnboarding(state.onboarding.map((o) => {
      if (o.id !== oid) return o;
      const assets = o.assets || { laptop: false, idCard: false, accessCard: false };
      return { ...o, assets: { ...assets, [key]: val } };
    }));
  }
  async function completeOnboarding(oid: string) {
    const o = state.onboarding.find((x) => x.id === oid);
    if (!o) return;
    if (o.employeeId) {
      await persistEmployees(state.employees.map((e) => (e.id === o.employeeId ? { ...e, status: 'probation', leaveBalance: { Casual: 0, Sick: 2, Earned: 0 }, documents: o.docs.map((d) => ({ name: d.name, status: d.status })) } : e)));
    }
    await persistOnboarding(state.onboarding.filter((x) => x.id !== oid));
  }

  const docUpdateEmployees = pendingEmployeeDocUpdates(state.employees);

  return (
    <>
      <PageHead />
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}>
        <HireEmployeeButton label="+ Send offer letter" className="btn primary" />
      </div>

      {state.onboarding.length === 0 && <div className="card"><div className="empty">No one currently in the onboarding pipeline.</div></div>}
      {state.onboarding.map((o) => (
        <OnboardingCard
          key={o.id} o={o}
          onDocAction={docAction}
          onDraftAgreement={() => setAgreementPreviewId(o.id)}
          onEmployerSign={() => employerSignAgreement(o.id)}
          onToggleAsset={(k, v) => toggleAsset(o.id, k, v)}
          onComplete={() => completeOnboarding(o.id)}
        />
      ))}

      <section className="block" style={{ marginTop: 8 }}>
        <div className="block-head"><h2>Document updates from active employees</h2></div>
        <div className="card">
          {docUpdateEmployees.length === 0 && <div className="empty">No pending document updates.</div>}
          {docUpdateEmployees.length > 0 && (
            <table><thead><tr><th>Employee</th><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>
                {docUpdateEmployees.flatMap((e) => e.documents.map((d, i) => d.status === 'pending' ? (
                  <tr key={e.id + i}><td>{e.name}</td><td>{d.name}</td><td><StatusBadge status={d.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn approve sm" onClick={() => empDocAction(e.id, i, 'approved')}>Approve</button>{' '}
                      <button className="btn reject sm" onClick={() => empDocAction(e.id, i, 'rejected')}>Reject with remarks</button>
                    </td>
                  </tr>
                ) : null))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {rejectTarget && (
        <ModalShell title="Reject document" onClose={() => setRejectTarget(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setRejectTarget(null) },
          { label: 'Reject', cls: 'btn reject', onClick: confirmReject },
        ]}>
          <div className="field"><label className="field-label">Remarks (required)</label><textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} /></div>
        </ModalShell>
      )}

      {agreementPreviewId && (() => {
        const o = state.onboarding.find((x) => x.id === agreementPreviewId);
        if (!o) return null;
        return (
          <ModalShell title="Preview — Employment Agreement" onClose={() => setAgreementPreviewId(null)} actions={[
            { label: 'Cancel', cls: 'btn', onClick: () => setAgreementPreviewId(null) },
            { label: 'Approve & Send', cls: 'btn primary', onClick: () => draftAgreement(o.id) },
          ]}>
            <div className="notice info" style={{ whiteSpace: 'pre-wrap' }}><strong>Preview</strong><br />{agreementMerged(o, state.employees, state.templates, state.rules)}</div>
            <div className="meta">This is exactly what {o.name.split(' ')[0]} will see as a pending action on their dashboard. Nothing is sent by email. You&apos;ll countersign after they sign.</div>
          </ModalShell>
        );
      })()}
    </>
  );
}

function OnboardingCard({ o, onDocAction, onDraftAgreement, onEmployerSign, onToggleAsset, onComplete }: {
  o: HrOnboarding;
  onDocAction: (oid: string, idx: number, status: 'approved' | 'rejected') => void;
  onDraftAgreement: () => void;
  onEmployerSign: () => void;
  onToggleAsset: (key: 'laptop' | 'idCard' | 'accessCard', val: boolean) => void;
  onComplete: () => void;
}) {
  if (o.stage === 'awaiting_signature') {
    return (
      <section className="block"><div className="card pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="row-name"><div className="avatar">{initials(o.name)}</div><div><div style={{ fontWeight: 600 }}>{o.name}</div><div className="meta">{o.designation} · {o.team} · ₹{o.ctc.toLocaleString('en-IN')} CTC</div></div></div>
          <span className="badge pending">{STAGE_LABEL[o.stage]}</span>
        </div>
        <div className="meta" style={{ marginTop: 10 }}>Offer letter sent {o.offerSentDate} to {o.personalEmail}. Once {o.name.split(' ')[0]} signs it, an Employee ID and login are issued automatically and their 7-day document window begins.</div>
      </div></section>
    );
  }

  const approvedCount = o.docs.filter((d) => d.status === 'approved').length;
  const uploadedCount = o.docs.filter((d) => ['approved', 'pending', 'rejected'].includes(d.status)).length;
  const pct = o.docs.length ? Math.round((approvedCount / o.docs.length) * 100) : 0;
  const dl = daysLeft(o.uploadDeadline);
  const overdue = dl !== null && dl < 0 && pct < 100;

  return (
    <section className="block"><div className="card pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="row-name"><div className="avatar">{initials(o.name)}</div><div><div style={{ fontWeight: 600 }}>{o.name}</div><div className="meta">{o.designation} · {o.employeeId} · window {o.signedDate} – {o.uploadDeadline}</div></div></div>
        <div style={{ textAlign: 'right' }}>
          <span className={`badge ${pct === 100 ? 'approved' : overdue ? 'rejected' : 'pending'}`}>{pct === 100 ? 'All docs approved' : overdue ? 'Window closed' : `${dl} day${dl === 1 ? '' : 's'} left`}</span>
          <div className="meta" style={{ marginTop: 4 }}>{approvedCount}/{o.docs.length} approved · {uploadedCount}/{o.docs.length} uploaded</div>
        </div>
      </div>
      <div className="progress-track" style={{ marginBottom: 14 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <table><thead><tr><th>Document</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>{o.docs.map((d, i) => (
          <tr key={i}><td>{d.name}</td><td><StatusBadge status={d.status} /></td>
            <td style={{ textAlign: 'right' }}>
              {d.status === 'pending' ? (
                <>
                  <button className="btn approve sm" onClick={() => onDocAction(o.id, i, 'approved')}>Approve</button>{' '}
                  <button className="btn reject sm" onClick={() => onDocAction(o.id, i, 'rejected')}>Reject with remarks</button>
                </>
              ) : d.status === 'not_uploaded' ? <span className="meta">not yet uploaded</span> : <span className="meta">reviewed</span>}
            </td>
          </tr>
        ))}</tbody>
      </table>
      {pct === 100 && <AgreementBlock o={o} onDraftAgreement={onDraftAgreement} onEmployerSign={onEmployerSign} onToggleAsset={onToggleAsset} onComplete={onComplete} />}
      {overdue && <div className="notice" style={{ marginTop: 14 }}>Upload window has closed with documents still missing or unreviewed. Follow up with {o.name.split(' ')[0]} directly, or extend the deadline.</div>}
    </div></section>
  );
}

function AgreementBlock({ o, onDraftAgreement, onEmployerSign, onToggleAsset, onComplete }: {
  o: HrOnboarding;
  onDraftAgreement: () => void; onEmployerSign: () => void;
  onToggleAsset: (key: 'laptop' | 'idCard' | 'accessCard', val: boolean) => void;
  onComplete: () => void;
}) {
  const { state } = useHrTool();

  if (o.agreementStage === 'not_started') {
    return (
      <div className="notice good" style={{ marginTop: 14 }}>All documents approved.
        <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={onDraftAgreement}>Draft Employment Agreement</button>
      </div>
    );
  }
  if (o.agreementStage === 'pending_employee_signature') {
    return (
      <div className="card pad" style={{ marginTop: 14, background: '#F1F5F9' }}>
        <div className="block-head"><h2>Employment Agreement</h2><span className="badge rmpending">Sent — awaiting employee signature</span></div>
        <div className="notice info" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}><strong>Preview</strong><br />{agreementMerged(o, state.employees, state.templates, state.rules)}</div>
      </div>
    );
  }
  if (o.agreementStage === 'pending_employer_signature') {
    return (
      <div className="card pad" style={{ marginTop: 14, background: '#F1F5F9' }}>
        <div className="block-head"><h2>Employment Agreement</h2><span className="badge hrpending">Employee signed — your countersignature required</span></div>
        <div className="notice info" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}><strong>Preview</strong><br />{agreementMerged(o, state.employees, state.templates, state.rules)}</div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={onEmployerSign}>✓ Confirm, looks correct — countersign</button>
      </div>
    );
  }
  if (o.agreementStage === 'signed') {
    if (state.rules.assetChecklist) {
      const assets = o.assets || { laptop: false, idCard: false, accessCard: false };
      const allIssued = assets.laptop && assets.idCard && assets.accessCard;
      return (
        <div className="card pad" style={{ marginTop: 14, background: '#F1F5F9' }}>
          <div className="block-head"><h2>Employment Agreement</h2><span className="badge approved">Signed by both parties</span></div>
          <button className="btn ghost sm" onClick={() => downloadDoc(`${o.name.replace(/\s+/g, '_')}_Employment_Agreement.txt`, agreementMerged(o, state.employees, state.templates, state.rules))}>⇩ Download</button>
          <div className="rule-desc" style={{ margin: '12px 0 8px', fontWeight: 600, color: 'var(--ink)' }}>Asset issuance checklist</div>
          <label style={{ display: 'block', marginBottom: 6 }}><input type="checkbox" checked={assets.laptop} onChange={(e) => onToggleAsset('laptop', e.target.checked)} /> Laptop issued</label>
          <label style={{ display: 'block', marginBottom: 6 }}><input type="checkbox" checked={assets.idCard} onChange={(e) => onToggleAsset('idCard', e.target.checked)} /> ID card issued</label>
          <label style={{ display: 'block', marginBottom: 10 }}><input type="checkbox" checked={assets.accessCard} onChange={(e) => onToggleAsset('accessCard', e.target.checked)} /> Access card issued</label>
          <button className="btn primary sm" disabled={!allIssued} onClick={onComplete}>Mark onboarding complete → Active</button>
          {!allIssued && <div className="meta" style={{ marginTop: 6 }}>Tick off all assets to complete onboarding.</div>}
        </div>
      );
    }
    return (
      <div className="notice good" style={{ marginTop: 14 }}>Employment Agreement signed by both parties.
        <button className="btn ghost sm" onClick={() => downloadDoc(`${o.name.replace(/\s+/g, '_')}_Employment_Agreement.txt`, agreementMerged(o, state.employees, state.templates, state.rules))}>⇩ Download</button>
        <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={onComplete}>Mark onboarding complete → Active</button>
      </div>
    );
  }
  return null;
}
