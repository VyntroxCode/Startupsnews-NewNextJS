'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { mergeTemplate, todayStr } from '../utils';

function DesignationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { state, persistDesignations, logRuleChange } = useHrTool();
  return (
    <select value={value} onChange={async (e) => {
      if (e.target.value === '__add_new__') {
        const name = prompt('New designation name (this gets added to Organisation Structure for future use too):');
        if (name && name.trim()) {
          if (!state.orgStructure.designations.includes(name.trim())) {
            await persistDesignations([...state.orgStructure.designations, name.trim()]);
            logRuleChange(`Added designation: ${name.trim()}`);
          }
          onChange(name.trim());
        }
        return;
      }
      onChange(e.target.value);
    }}>
      <option value="">— Select —</option>
      {state.orgStructure.designations.map((d) => <option key={d} value={d}>{d}</option>)}
      <option value="__add_new__">+ Add new designation…</option>
    </select>
  );
}

interface OfferDraft { name: string; personalEmail: string; designation: string; team: string; ctc: number; }

/** Self-contained "+ Draft offer letter" button — draft form, preview, and send, all in one
 * place, shared by the Employee Directory and Onboarding views. */
export default function DraftOfferLetterButton({ label, className }: { label: string; className: string }) {
  const { state, persistOnboarding } = useHrTool();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [team, setTeam] = useState(state.teams[0]?.name || '');
  const [ctc, setCtc] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<OfferDraft | null>(null);

  function openAdd() {
    setName(''); setEmail(''); setDesignation(''); setTeam(state.teams[0]?.name || ''); setCtc(''); setError('');
    setAddOpen(true);
  }
  function previewOffer() {
    if (!name.trim()) { setError("Please enter the candidate's full name."); return; }
    if (!designation) { setError('Please choose a designation.'); return; }
    setAddOpen(false);
    setPreview({ name: name.trim(), personalEmail: email.trim() || '—', designation, team, ctc: Number(ctc) || 0 });
  }
  async function approveAndSend() {
    if (!preview) return;
    const newOnboarding = {
      id: 'O-' + Date.now(), name: preview.name, personalEmail: preview.personalEmail, designation: preview.designation,
      team: preview.team, ctc: preview.ctc, stage: 'awaiting_signature', offerSentDate: todayStr(),
      signedDate: null, uploadDeadline: null, employeeId: null, agreementStage: 'not_started', docs: [],
    };
    await persistOnboarding([...state.onboarding, newOnboarding]);
    setPreview(null);
  }

  return (
    <>
      <button className={className} onClick={openAdd}>{label}</button>

      {addOpen && (
        <ModalShell title="Draft offer letter" onClose={() => setAddOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setAddOpen(false) },
          { label: 'Preview offer letter', cls: 'btn primary', onClick: previewOffer },
        ]}>
          <div className="notice info">Fill in the details, then preview exactly what the candidate will see before anything goes out. Designation is picked from Organisation Structure — if it&apos;s missing, add it right here and it&apos;s saved for future use.</div>
          <div className="field"><label className="field-label">Full name</label><input type="text" placeholder="e.g. Kavita Rao" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label className="field-label">Personal email (for your records only — nothing is emailed)</label><input type="text" placeholder="e.g. kavita@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label className="field-label">Designation</label><DesignationSelect value={designation} onChange={setDesignation} /></div>
          <div className="field"><label className="field-label">Team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)}>{state.teams.map((t) => <option key={t.name}>{t.name}</option>)}</select>
          </div>
          <div className="field"><label className="field-label">Annual CTC (₹)</label><input type="number" placeholder="e.g. 480000" value={ctc} onChange={(e) => setCtc(e.target.value)} /></div>
          {error && <div className="notice" style={{ background: 'var(--red-soft)', borderColor: '#FECACA', color: 'var(--red)' }}>{error}</div>}
        </ModalShell>
      )}

      {preview && (
        <ModalShell title="Preview — Offer Letter" onClose={() => setPreview(null)} actions={[
          { label: 'Back to edit', cls: 'btn', onClick: () => { setAddOpen(true); setPreview(null); } },
          { label: 'Approve & Send', cls: 'btn primary', onClick: approveAndSend },
        ]}>
          <div className="notice info">This is exactly what {preview.name.split(' ')[0]} will see in their portal. Nothing is sent — not even by email — until you approve.</div>
          <div className="card pad" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
            {mergeTemplate(state.templates['Offer Letter']?.content || '', { employee_name: preview.name, designation: preview.designation, team: preview.team, ctc: '₹' + preview.ctc.toLocaleString('en-IN') })}
          </div>
        </ModalShell>
      )}
    </>
  );
}
