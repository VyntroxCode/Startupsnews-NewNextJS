'use client';

import { useRef, type ReactNode } from 'react';

export interface ModalAction { label: string; cls: string; onClick: () => void | Promise<void>; }

/** Presentational modal shell. Each view keeps its own open/closed + form state locally
 * and renders this conditionally — that keeps every control inside it a normal, live
 * controlled React input instead of a frozen snapshot. */
export default function ModalShell({ title, onClose, actions, children, maxWidth }: {
  title: string; onClose: () => void; actions: ModalAction[]; children: ReactNode; maxWidth?: number;
}) {
  // Selecting text inside the modal (e.g. to copy a password) and releasing the mouse
  // outside it — a very common drag path — used to register as a backdrop click and
  // close the modal mid-selection. Only close when both the press AND the release
  // happened directly on the backdrop, not just the release.
  const pressedBackdrop = useRef(false);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { pressedBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && pressedBackdrop.current) onClose(); }}
    >
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-head"><h3>{title}</h3><button className="x-close" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          {actions.map((a, i) => <button key={i} className={a.cls} onClick={() => a.onClick()}>{a.label}</button>)}
        </div>
      </div>
    </div>
  );
}
