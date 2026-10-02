"use client";

import { Circle, CircleCheck, Sparkles, TriangleAlert } from "lucide-react";

import { Spinner } from "@/modules/content-studio/components/ui";
import { useSettings, useSource } from "@/modules/content-studio/lib/state/StudioProvider";

// ── NAV (content-studio-v17.html:355-363) ──
export function TopNav() {
  return (
    <nav className="z-[300] flex h-[54px] shrink-0 items-center gap-3 border-b border-cs-edge bg-cs-surface px-5 shadow-cs-soft">
      <div className="flex items-center gap-2 font-cs-serif text-[19px] font-semibold">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-cs-accent to-cs-adark text-white shadow-[0_2px_8px_rgba(232,24,109,.3)]">
          <Sparkles aria-hidden className="size-3.5" />
        </div>
        <span>
          <em className="text-cs-accent not-italic">Content</em> Studio
        </span>
      </div>
      <div className="flex-1" />
    </nav>
  );
}

// ── API ROW (content-studio-v17.html:366-369) ──
// The key itself never reaches the browser; the server passes down only
// whether one is configured, and the model name.
export function ApiStatusRow({
  configured,
  model,
}: {
  configured: boolean;
  model: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-4 bg-gradient-to-br from-[#c4134e] to-[#9a0e3d] px-5 py-2.5 text-white">
      <div className="min-w-0 flex-1">
        <strong className="text-cs-ui font-bold">Azure OpenAI · {model}</strong>
        <span className="ml-2 text-cs-meta opacity-72">
          {configured
            ? "Key is set server-side and never sent to the browser"
            : "Set AZURE_OPENAI_API_KEY, _ENDPOINT and _DEPLOYMENT in the server .env and restart"}
        </span>
      </div>
      <span
        className={`inline-flex items-center gap-1 text-cs-meta whitespace-nowrap ${configured ? "text-[#86efac]" : "opacity-85"}`}
      >
        {configured ? (
          <>
            <CircleCheck aria-hidden className="size-3 shrink-0" />
            {model}
          </>
        ) : (
          <>
            <Circle aria-hidden className="size-2 shrink-0 fill-current" />
            Not configured
          </>
        )}
      </span>
    </div>
  );
}

// ── STATUS BAR (content-studio-v17.html:601-604) ──
export function StatusBar() {
  const { status } = useSource();
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-cs-edge bg-cs-s2 px-3.5 py-[5px] text-cs-meta text-cs-t2">
      {status.loading ? <Spinner size="dark" /> : null}
      <span>{status.text}</span>
    </div>
  );
}

/**
 * Surfaced when localStorage is unavailable. The original promised this
 * warning in a comment (content-studio-v17.html:692-693) but never rendered it.
 */
export function StorageBlockedBanner() {
  const { storageBlocked } = useSettings();
  if (!storageBlocked) return null;
  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-cs-warn/20 bg-cs-warnbg px-5 py-1.5 text-center text-cs-meta font-semibold text-cs-warn">
      <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
      Browser storage is blocked, so feeds, authors and sources will not
      survive a reload.
    </div>
  );
}
