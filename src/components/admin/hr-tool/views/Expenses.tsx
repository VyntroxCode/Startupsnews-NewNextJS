'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { ApprovalBadge, applyApprovalDecision, scopedApprovals } from '../utils';

export default function Expenses() {
  const { state, persistExpenses } = useHrTool();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(state.orgStructure.expenseCategories[0] || '');
  const [amount, setAmount] = useState('');

  const rows = scopedApprovals(state.expenses, state.role, state.currentUser?.name, state.employees);

  function openSubmit() {
    setCategory(state.orgStructure.expenseCategories[0] || '');
    setAmount('');
    setOpen(true);
  }
  async function submit() {
    if (!state.currentUser) return;
    // Single approval step for every module now (see Rules → Approval chain): HR Head when the
    // toggle is on, Founder/admin when it's off. Leaving these on 'rm' would strand leave and
    // expense requests exactly the way attendance regularizations were stranded.
    const stage = 'hr';
    await persistExpenses([{
      id: 'X-' + Date.now(), emp: state.currentUser.name, category, amount: Number(amount) || 0,
      stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    }, ...state.expenses]);
    setOpen(false);
  }
  async function decide(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    await persistExpenses(state.expenses.map((x) => (x.id === id ? applyApprovalDecision(x, level, decision, remarks, state.rules.twoLevelApproval.expense) : x)));
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Expense Reimbursement</h1><div className="page-sub">Approved amounts flow into the next payroll cycle automatically. {state.rules.twoLevelApproval.expense ? 'Manager approves first, then HR.' : 'HR approves directly.'}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 14 }}><button className="btn primary" onClick={openSubmit}>+ Submit expense</button></div>
      <div className="card"><table><thead><tr><th>Employee</th><th>Category</th><th>Amount</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}><td>{x.emp}</td><td>{x.category}</td><td>₹{x.amount.toLocaleString('en-IN')}</td><td><ApprovalBadge req={x} /></td>
              <td style={{ textAlign: 'right' }}><ApprovalCell req={x} onDecide={(level, decision, remarks) => decide(x.id, level, decision, remarks)} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5}><div className="empty">No expense claims.</div></td></tr>}
        </tbody>
      </table></div>

      {open && (
        <ModalShell title="Submit expense" onClose={() => setOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setOpen(false) },
          { label: 'Submit', cls: 'btn primary', onClick: submit },
        ]}>
          <div className="field"><label className="field-label">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{state.orgStructure.expenseCategories.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="field"><label className="field-label">Amount (₹)</label><input type="number" placeholder="e.g. 850" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="field"><label className="field-label">Bill / receipt</label><input type="file" /></div>
        </ModalShell>
      )}
    </>
  );
}
