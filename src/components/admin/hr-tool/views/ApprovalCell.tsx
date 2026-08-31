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
  // HR Head / Founder can act at ANY stage, not just 'hr'. Gating them on stage === 'hr' left
  // every request permanently stuck the moment the employee had no Reporting Manager set:
  // two-level approval creates the request at stage 'rm', only an actual RM could clear that
  // stage, and with no RM assigned there was nobody on the system able to touch it.
  // applyApprovalDecision's 'hr' branch finalises the request outright, so acting early is a
  // clean override rather than a half-completed state machine.
  const canActHR = isAdmin(state.role) && req.status === 'pending';
  const isOverridingRmStep = canActHR && req.stage === 'rm';

  function open(level: 'rm' | 'hr', decision: 'approved' | 'rejected') { setPending({ level, decision }); setRemarks(''); }
  function confirmDecision() {
    if (!pending) return;
    onDecide(pending.level, pending.decision, remarks.trim());
    setPending(null);
  }

  if (!canActRM && !canActHR) return <>—</>;
  const level: 'rm' | 'hr' = canActRM ? 'rm' : 'hr';

  return (
    <>
      <button className="btn approve sm" onClick={() => open(level, 'approved')}>Approve</button>{' '}
      <button className="btn reject sm" onClick={() => open(level, 'rejected')}>Reject</button>
      {pending && (
        <ModalShell title={pending.decision === 'rejected' ? 'Reject — remarks (optional)' : 'Approve — remarks (optional)'} onClose={() => setPending(null)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setPending(null) },
          { label: pending.decision === 'rejected' ? 'Reject' : 'Approve', cls: pending.decision === 'rejected' ? 'btn reject' : 'btn approve', onClick: confirmDecision },
        ]}>
          {isOverridingRmStep && (
            <div className="notice">This request is still waiting on the Reporting Manager. Deciding it now closes it outright on your authority.</div>
          )}
          <div className="field"><label className="field-label">Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="optional" />
          </div>
        </ModalShell>
      )}
    </>
  );
}
