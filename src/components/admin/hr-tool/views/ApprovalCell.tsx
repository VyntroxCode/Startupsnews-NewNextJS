'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import { isAdmin, rmOf } from '../utils';

interface ApprovableRequest { id: string; emp: string; stage: string; status: string; }

/** Inline Approve / Reject buttons for a two-level (Reporting Manager → HR) approval row,
 * shared by Attendance regularizations, Leave requests, and Expense claims. */
export default function ApprovalCell({ req, onDecide }: {
  req: ApprovableRequest;
  onDecide: (level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) => void;
}) {
  const { state } = useHrTool();
  const [pending, setPending] = useState<{ level: 'rm' | 'hr'; decision: 'approved' | 'rejected' } | null>(null);
  const [remarks, setRemarks] = useState('');

  const canActRM = state.role === 'Reporting Manager' && req.stage === 'rm' && rmOf(state.employees, req.emp) === state.currentUser?.name && req.status === 'pending';
  const canActHR = isAdmin(state.role) && req.stage === 'hr' && req.status === 'pending';

  function open(level: 'rm' | 'hr', decision: 'approved' | 'rejected') { setPending({ level, decision }); setRemarks(''); }
  function confirmDecision() {
    if (!pending) return;
    if (pending.decision === 'rejected' && !remarks.trim()) { alert('Remarks required.'); return; }
    onDecide(pending.level, pending.decision, remarks.trim());
    setPending(null);
  }

  if (!canActRM && !canActHR) return <>—</>;
  const level: 'rm' | 'hr' = canActRM ? 'rm' : 'hr';

  return (
    <>
      <button className="btn approve sm" onClick={() => open(level, 'approved')}>Approve</button>{' '}
      <button className="btn reject sm" onClick={() => open(level, 'rejected')}>Reject with remarks</button>
      {pending && (
        <ModalShell title={pending.decision === 'rejected' ? 'Reject — remarks required' : 'Approve — remarks (optional)'} onClose={() => setPending(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setPending(null) },
          { label: pending.decision === 'rejected' ? 'Reject' : 'Approve', cls: pending.decision === 'rejected' ? 'btn reject' : 'btn approve', onClick: confirmDecision },
        ]}>
          <div className="field"><label className="field-label">Remarks{pending.decision === 'rejected' ? ' (required)' : ''}</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={pending.decision === 'approved' ? 'optional' : undefined} />
          </div>
        </ModalShell>
      )}
    </>
  );
}
