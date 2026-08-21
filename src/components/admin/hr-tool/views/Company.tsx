'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { loadScriptOnce, mergeTemplate, salaryPeriodLabel, shiftTimingsLabel } from '../utils';

interface MammothWindow { mammoth?: { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } }

const SAMPLE_MERGE_DATA = {
  employee_name: 'Jane Doe', designation: 'Content Writer', team: 'Content', doj: '2026-08-05',
  // ₹6,00,000 CTC at the default CTC Structure (Basic 50% of salary, HRA 50% of Basic,
  // Convenience ₹0, Special Allowance the remainder) — see computeCtcBreakdown.
  ctc: '₹6,00,000', basic: '₹3,00,000', hra: '₹1,50,000', convenience: '₹0', allowances: '₹1,50,000',
};

export default function Company() {
  const { state, logRuleChange } = useHrTool();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Company Profile</h1><div className="page-sub">Configured once — drives attendance, leave, and payroll automatically. Fine-tune rules anytime from Rules &amp; Org Structure.</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="grid grid-2">
        <div className="card pad">
          <div className="block-head"><h2>Registered details</h2></div>
          <div className="field"><label className="field-label">Company name</label>DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi)</div>
          <div className="field"><label className="field-label">CIN</label>U74999DL2021PTC123456</div>
          <div className="field"><label className="field-label">Registered state</label>Delhi</div>
        </div>
        <div className="card pad">
          <div className="block-head"><h2>Work policy (from Rules &amp; Org Structure)</h2></div>
          <div className="field"><label className="field-label">Working days</label>{state.rules.workingDaysPattern}</div>
          <div className="field"><label className="field-label">Shift</label>{shiftTimingsLabel(state.rules)}</div>
          <div className="field"><label className="field-label">Salary period</label>{salaryPeriodLabel(state.rules)}</div>
        </div>
      </div>
      <section className="block" style={{ marginTop: 20 }}>
        <div className="block-head"><h2>Letter templates — drafted and edited right here</h2></div>
        <div className="card"><table><thead><tr><th>Document type</th><th>Draft status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {Object.entries(state.templates).map(([type, t]) => (
              <tr key={type}><td>{type}</td>
                <td>{t.content && t.content.trim() ? <span className="meta">Draft on file — {t.content.length} characters</span> : <span className="badge notuploaded">No draft yet</span>}</td>
                <td style={{ textAlign: 'right' }}><button className="btn sm" onClick={() => setEditing(type)}>{t.content && t.content.trim() ? 'Edit draft' : 'Create draft'}</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="footnote">Every generated document fills in from these drafts using merge-fields, and always shows a full preview to HR before it&apos;s approved and sent — nothing is emailed, it lands as a pending action on the recipient&apos;s dashboard.</div>
      </section>

      {editing && <TemplateEditorModal type={editing} onClose={() => setEditing(null)} onSaved={(t) => logRuleChange(`Updated "${t}" template draft`)} />}
    </>
  );
}

function TemplateEditorModal({ type, onClose, onSaved }: { type: string; onClose: () => void; onSaved: (type: string) => void }) {
  const { state, persistTemplate } = useHrTool();
  const [content, setContent] = useState(state.templates[type]?.content || '');
  const [preview, setPreview] = useState<string | null>(null);
  const extraTags = type === 'Employment Agreement' ? ', {{basic}}, {{hra}}, {{convenience}}, {{allowances}}' : '';

  async function handleDocxUpload(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const w = window as unknown as MammothWindow;
      try {
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', () => typeof w.mammoth !== 'undefined');
        const result = await w.mammoth!.extractRawText({ arrayBuffer: e.target!.result as ArrayBuffer });
        setContent(result.value);
      } catch {
        alert("Couldn't read that Word file. Try pasting the text directly instead.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function save() {
    await persistTemplate(type, content);
    onSaved(type);
    onClose();
  }

  return (
    <ModalShell title={'Draft — ' + type} onClose={onClose} actions={[
      { label: 'Cancel', cls: 'btn', onClick: onClose },
      { label: 'Save draft', cls: 'btn primary', onClick: save },
    ]}>
      <div className="notice info">Merge tags available: {'{{employee_name}}, {{designation}}, {{team}}, {{doj}}, {{ctc}}' + extraTags}. They auto-fill when the document is generated.</div>
      <div className="field"><label className="field-label">Upload a Word document (.docx) to pull its text in — or just type/paste below</label>
        <input type="file" accept=".docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocxUpload(f); }} />
      </div>
      <div className="field"><textarea style={{ minHeight: 200 }} value={content} onChange={(e) => setContent(e.target.value)} /></div>
      <button className="btn sm" onClick={() => setPreview(mergeTemplate(content, SAMPLE_MERGE_DATA))}>Preview with sample data</button>
      {preview && <div className="notice info" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}><strong>Sample preview</strong><br />{preview}</div>}
    </ModalShell>
  );
}
