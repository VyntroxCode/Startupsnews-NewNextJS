'use client';

import { useState, type CSSProperties } from 'react';
import { useHrTool } from '../HrToolContext';
import { addDays, mergeTemplate, nextEmployeeId, todayStr } from '../utils';

type Screen = 'login' | 'sign-offer' | 'signed';

export default function Login() {
  const { state, login, persistOnboarding, persistEmployees } = useHrTool();
  const [screen, setScreen] = useState<Screen>('login');
  const [loginId, setLoginId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pickedOfferId, setPickedOfferId] = useState('');
  const [signedInfo, setSignedInfo] = useState<{ firstName: string; id: string; deadline: string } | null>(null);

  const loginable = state.employees.filter((e) => e.status !== 'exited');
  const pendingOffers = state.onboarding.filter((o) => o.stage === 'awaiting_signature');
  const picked = pendingOffers.find((o) => o.id === pickedOfferId) || null;

  function doLogin() {
    const id = loginId.trim().toUpperCase();
    const emp = state.employees.find((e) => e.id.toUpperCase() === id && e.status !== 'exited');
    if (!emp) {
      setLoginError("We couldn't find an active account with that Employee ID. Check the ID or use one of the demo IDs below.");
      return;
    }
    login(emp);
  }

  async function signOffer(id: string) {
    const o = state.onboarding.find((x) => x.id === id);
    if (!o) return;
    const today = todayStr();
    const newId = nextEmployeeId(state.employees);
    const teamManager = state.teams.find((t) => t.name === o.team)?.manager || null;
    const offerTemplate = state.templates['Offer Letter']?.content || '';
    const offerMerged = mergeTemplate(offerTemplate, { employee_name: o.name, designation: o.designation, team: o.team, ctc: '₹' + o.ctc.toLocaleString('en-IN') });
    const uploadDeadline = addDays(today, 7);
    const updatedOnboarding = state.onboarding.map((x) => (x.id === id ? {
      ...x, signedDate: today, uploadDeadline, stage: 'doc_upload', employeeId: newId,
      docs: state.orgStructure.requiredDocuments.map((name) => ({ name, status: 'not_uploaded' })),
    } : x));
    const newEmployee = {
      id: newId, name: o.name, email: o.name.toLowerCase().replace(/\s+/g, '.') + '@snf.co', phone: null, designation: o.designation,
      team: o.team, manager: teamManager, status: 'onboarding', doj: today, sysRole: 'Employee', ctc: o.ctc,
      leaveBalance: { Casual: 0, Sick: 0, Earned: 0 }, documents: [],
      signedDocs: [{ type: 'Offer Letter', content: offerMerged, signedDate: today }],
    };
    await persistOnboarding(updatedOnboarding);
    await persistEmployees([...state.employees, newEmployee]);
    setSignedInfo({ firstName: o.name.split(' ')[0], id: newId, deadline: uploadDeadline });
    setScreen('signed');
  }

  const shellStyle: CSSProperties = {
    minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg,#FFF 0%,#EEF2FF 60%,#C7D2FE 100%)', padding: 20, borderRadius: 12,
  };
  const brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 22 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Space Grotesk'", fontWeight: 700 }}>H</div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 21, color: 'var(--ink)' }}>Huey</div>
    </div>
  );

  if (screen === 'signed' && signedInfo) {
    return (
      <div style={shellStyle}>
        <div className="card pad" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>✓</div>
          <h3 style={{ margin: '0 0 8px' }}>Offer signed, {signedInfo.firstName}!</h3>
          <div className="meta" style={{ marginBottom: 14 }}>
            Your Employee ID is <strong>{signedInfo.id}</strong>. In production this and a password are shared with you directly through the portal — not by email.
            Log in now — you have <strong>7 days</strong> (until {signedInfo.deadline}) to upload your documents for HR review.
          </div>
          <button className="btn primary" onClick={() => setScreen('login')}>Go to login →</button>
        </div>
      </div>
    );
  }

  if (screen === 'sign-offer') {
    return (
      <div style={shellStyle}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          {brand}
          <div className="card pad">
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Sign your offer letter</h3>
            <div className="meta" style={{ marginBottom: 16 }}>In production this page opens from a unique link HR emails to your personal address. Pick your name below for this preview.</div>
            <div className="field"><label className="field-label">Your name</label>
              <select value={pickedOfferId} onChange={(e) => setPickedOfferId(e.target.value)}>
                <option value="">— Select —</option>
                {pendingOffers.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.designation}</option>)}
              </select>
            </div>
            {picked && (
              <>
                <div className="notice info" style={{ marginTop: 14 }}>
                  <div><strong>Preview — generated from &quot;{state.templates['Offer Letter'] ? 'Offer Letter' : 'default'}&quot; template</strong><br />
                    <strong>{picked.name}</strong> — offer for <strong>{picked.designation}</strong>, {picked.team}<br />
                    Annual CTC: ₹{picked.ctc.toLocaleString('en-IN')} · Offer sent {picked.offerSentDate}<br />
                    By signing, you accept the terms of employment. HR will then generate your Employee ID and login — you&apos;ll have <strong>7 days from signing</strong> to upload your onboarding documents.</div>
                </div>
                <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => signOffer(picked.id)}>✓ Confirm, looks correct — sign offer letter</button>
              </>
            )}
          </div>
          <div className="footnote" style={{ textAlign: 'center' }}><a href="#" onClick={(e) => { e.preventDefault(); setScreen('login'); }} style={{ color: 'var(--forest)', fontWeight: 600 }}>← Back to login</a></div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {brand}
        <div className="card pad">
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Log in</h3>
          <div className="meta" style={{ marginBottom: 16 }}>Enter your Employee ID. In production this pairs with a password/OTP and looks up your account on a real server.</div>
          <div className="field">
            <label className="field-label">Employee ID</label>
            <input type="text" placeholder="e.g. E-101" list="empIdList" value={loginId}
              onChange={(e) => setLoginId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }} />
            <datalist id="empIdList">{loginable.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.sysRole}</option>)}</datalist>
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input type="text" placeholder="Any value works in this preview" defaultValue="••••••••" />
          </div>
          {loginError && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{loginError}</div>}
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={doLogin}>Log in →</button>
        </div>
        <div className="footnote" style={{ textAlign: 'center' }}>
          Start typing an Employee ID to see matching accounts.<br /><br />
          Received an offer letter? <a href="#" onClick={(e) => { e.preventDefault(); setScreen('sign-offer'); }} style={{ color: 'var(--forest)', fontWeight: 600 }}>Sign it and get your login →</a>
        </div>
      </div>
    </div>
  );
}
