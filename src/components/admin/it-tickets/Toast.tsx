'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from './TicketIcons';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const AUTO_DISMISS_MS = 3500;

/** The admin panel has no toast utility, so the tickets feature carries a tiny one: state lives in
 * the page, `push()` is handed down, and `<ToastViewport>` renders bottom-right above the dialogs. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return { toasts, push, dismiss };
}

const KIND_CLASSES: Record<ToastKind, string> = {
  success: 'border-emerald-200 bg-white text-slate-800',
  error: 'border-red-200 bg-white text-red-800',
  info: 'border-slate-200 bg-white text-slate-800',
};

const DOT_CLASSES: Record<ToastKind, string> = {
  success: 'bg-emerald-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-indigo-500 text-white',
};

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[1400] flex w-[min(360px,calc(100vw-40px))] flex-col gap-2" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-toast={t.kind}
          className={`pointer-events-auto flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm shadow-lg ${KIND_CLASSES[t.kind]}`}
        >
          <span className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${DOT_CLASSES[t.kind]}`}>
            {t.kind === 'error' ? <CloseIcon size={11} /> : <CheckIcon size={11} />}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button type="button" aria-label="Dismiss" className="-mr-1 rounded border-0 bg-transparent p-1 text-slate-400 hover:text-slate-700" onClick={() => onDismiss(t.id)}>
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
