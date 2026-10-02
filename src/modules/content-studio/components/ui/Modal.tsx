"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { studioFontVars } from "@/modules/content-studio/components/shell/fonts";
import { useHydrated } from "@/modules/content-studio/lib/hooks/useHydrated";

/**
 * Shared overlay shell for the two modals.
 *
 * Portalled to <body> because <body> carries `overflow-hidden` and the modals
 * would otherwise be fixed-position children of a `flex-1 min-h-0` subtree —
 * a stacking-context accident waiting to happen. z-index values are preserved
 * from the original: the news workspace sits below the author roster.
 */
export function Modal({
  open,
  onClose,
  z = 9990,
  backdrop = true,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  z?: number;
  backdrop?: boolean;
  children: ReactNode;
  className?: string;
}) {
  // Portals need a DOM target, so nothing renders until after hydration.
  const mounted = useHydrated();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: z }}
      // Portaled to <body>, outside the page's .content-studio-scope, so it carries the scope itself.
      className={
        backdrop
          ? `${studioFontVars} content-studio-scope fixed inset-0 flex items-center justify-center bg-[rgba(17,24,39,.55)] p-6 font-cs-sans text-sm leading-[1.6] text-cs-ink`
          : `${studioFontVars} content-studio-scope fixed inset-0 flex flex-col bg-cs-bg font-cs-sans text-sm leading-[1.6] text-cs-ink`
      }
      onClick={backdrop ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <div className={className}>{children}</div>
    </div>,
    document.body,
  );
}
