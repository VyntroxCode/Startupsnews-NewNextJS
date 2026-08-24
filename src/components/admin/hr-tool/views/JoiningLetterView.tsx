'use client';

import { COMPANY, amountToIndianWords, ordinalDate, todayStr, type OfferLetterData } from '../utils';

/** On-screen rendering of the default generated Joining Letter — matches the company's actual
 * offer-letter template exactly (logo, a single offer paragraph with the annual compensation
 * spelled out in words, a portal-login line, the document checklist, and the standard
 * acceptance/closing) rather than the elaborate numbered-sections format this used to have.
 * Deliberately doesn't itemize the CTC split (Basic/HRA/Convenience) the way the internal
 * Payroll/CTC Structure tooling does — that breakdown is for payroll math, not this letter.
 * Mirrors joiningLetterPdf.ts so the preview and the downloaded PDF read as the same document. */
export function JoiningLetterView({ d }: { d: OfferLetterData }) {
  const firstName = d.employeeName.trim().split(/\s+/)[0] || d.employeeName;
  const dateStr = ordinalDate(todayStr());
  const ctcWords = amountToIndianWords(d.ctc);

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.7 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed local asset in a modal, not worth next/image's overhead here */}
      <img src="/logo.png" alt={COMPANY.brand} style={{ height: 40, width: 'auto', display: 'block' }} />

      <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 24 }}>Date: {dateStr}</div>

      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginTop: 24 }}>
        Offer Letter : &quot;{d.designation}&quot;
      </div>

      <p style={{ marginTop: 24 }}>Dear {firstName},</p>

      <p>
        With reference to your application &amp; subsequent Interview we had with you, we are pleased to offer you
        employment as &quot;{d.designation}&quot; in our organization. Your joining date is {ordinalDate(d.doj, false)}, and
        Your Annual Compensation will be Rs. {d.ctc.toLocaleString('en-IN')}/- ({ctcWords} Only) and you will be on a
        probation of 3 months.
      </p>

      <p>
        You will be able to track your onboarding via our Employee Portal — sign in with Employee ID{' '}
        <strong>{d.employeeCode}</strong> and password <strong>{d.password}</strong> (please change it after your first login).
      </p>

      <p style={{ marginBottom: 4 }}>You are requested to share following documents for completion of processes:</p>
      {d.requiredDocuments.length ? (
        <ul style={{ margin: '0 0 16px', paddingLeft: 20 }}>
          {d.requiredDocuments.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>(to be communicated by HR)</p>}

      <p>Please confirm your acceptance to this Offer. On completion of these Documents, your joining would be completed.</p>

      <p>Kindly check and return a copy of duly signed Appointment Letter in acceptance of the terms and conditions mentioned after receiving.</p>

      <div style={{ marginTop: 40, width: 200, borderTop: '1px solid var(--ink)' }} />
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>Authorised Signatory</div>

      <p style={{ marginTop: 16 }}>
        Warm Regards;<br />
        {COMPANY.brand}
      </p>

      <p style={{ marginTop: 32 }}>
        I agree to become part of <strong><em>Team {COMPANY.brand}</em></strong> on the terms and conditions mentioned in the letter.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, maxWidth: 420 }}>
        <span>Place: _______________</span>
        <span>Signature: _______________</span>
      </div>
      <div style={{ marginTop: 8 }}>Date: _______________</div>

      <div style={{ marginTop: 40, fontSize: 10.5, color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <div>{COMPANY.name}</div>
        <div>{COMPANY.cin}</div>
        <div>{COMPANY.address}</div>
        <div>{COMPANY.email}</div>
      </div>
    </div>
  );
}
