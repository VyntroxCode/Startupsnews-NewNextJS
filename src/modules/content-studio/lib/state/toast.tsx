"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

// Ported from `toast()`, content-studio-v17.html:2299.
// A separate tiny provider because toast() is called from ~30 sites and must
// never re-render the rest of the tree.

export type ToastTone = "success" | "warning" | "error" | "info";

/** `tone` picks the icon shown before the message; omit it for plain text. */
export type ToastFn = (msg: string, tone?: ToastTone) => void;

const TONE_ICONS: Record<ToastTone, { Icon: LucideIcon; className: string }> = {
  success: { Icon: CircleCheck, className: "size-4 shrink-0 text-[#86efac]" },
  warning: { Icon: TriangleAlert, className: "size-4 shrink-0 text-[#fcd34d]" },
  error: { Icon: CircleX, className: "size-4 shrink-0 text-[#fca5a5]" },
  info: { Icon: Info, className: "size-4 shrink-0 text-white/80" },
};

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<{ text: string; tone?: ToastTone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ToastFn>((msg, tone) => {
    setMessage({ text: msg, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-[9999] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-cs-ink px-[22px] py-2.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-cs-lift transition-all duration-200 ${
          message ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"
        }`}
      >
        {message?.tone ? <ToneIcon tone={message.tone} /> : null}
        {message?.text}
      </div>
    </ToastContext.Provider>
  );
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const { Icon, className } = TONE_ICONS[tone];
  return <Icon aria-hidden className={className} />;
}
