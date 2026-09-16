'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  size?: 'md' | 'xl';
  /** id of the element that names the dialog (for aria-labelledby). */
  labelledBy?: string;
  /** Extra classes on the panel (e.g. `p-0` when the child manages its own padding). */
  className?: string;
  children: ReactNode;
}

const SIZE_CLASSES = {
  md: 'max-w-[720px]',
  xl: 'max-w-[1080px]',
};

/**
 * Shared dialog shell for the create dialog and the issue view.
 *
 * z-[1200]: decisively above AdminHeader/AdminSidebar's fixed chrome (z-index 999-1000) — a tied
 * z-index there is a coincidence, not a guarantee the modal wins the stacking order. Backdrop click
 * and Escape both close (same behaviour as sales-tracker's SponsorEventDetailModal); body scroll is
 * locked while open so the board behind does not scroll under a long issue view.
 */
export default function Modal({ onClose, size = 'md', labelledBy, className = '', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Only a mousedown that STARTED on the backdrop closes it — a text-selection drag that ends on the
  // backdrop, or a drop from a file picker, must not.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-slate-900/55 px-4 py-12 backdrop-blur-[2px] max-sm:px-2.5 max-sm:py-4"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full min-w-0 ${SIZE_CLASSES[size]} rounded-2xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
