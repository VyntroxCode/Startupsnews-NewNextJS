'use client';

import type { ReactNode } from 'react';

export interface ModalAction { label: string; cls: string; onClick: () => void | Promise<void>; }

/** Presentational modal shell. Each view keeps its own open/closed + form state locally
 * and renders this conditionally — that keeps every control inside it a normal, live
 * controlled React input instead of a frozen snapshot. */
export default function ModalShell({ title, onClose, actions, children }: { title: string; onClose: () => void; actions: ModalAction[]; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head"><h3>{title}</h3><button className="x-close" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          {actions.map((a, i) => <button key={i} className={a.cls} onClick={() => a.onClick()}>{a.label}</button>)}
        </div>
      </div>
    </div>
  );
}
