"use client";

import { ChevronDown, ChevronUp, Link, Newspaper, PenLine, Settings, Zap } from "lucide-react";

import { Button, GenerateButton } from "@/modules/content-studio/components/ui";
import {
  useOutput,
  useSettings,
  useSource,
  useSourceDispatch,
} from "@/modules/content-studio/lib/state/StudioProvider";
import { useGenerate } from "@/modules/content-studio/lib/hooks/useGenerate";
import { cn } from "@/modules/content-studio/lib/cn";
import type { SourceMode } from "@/modules/content-studio/types";

// ── GEN BAR (content-studio-v17.html:476-501) ──

const TABS: { id: SourceMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "url",
    label: "URL Import",
    icon: <Link aria-hidden className="size-[11px] shrink-0" strokeWidth={2.5} />,
  },
  {
    id: "topic",
    label: "Topic",
    icon: <PenLine aria-hidden className="size-[11px] shrink-0" strokeWidth={2.5} />,
  },
  {
    id: "news",
    label: "News",
    icon: <Newspaper aria-hidden className="size-[11px] shrink-0" strokeWidth={2.5} />,
  },
];

export function GenerateBar() {
  const { mode, selectedArticle } = useSource();
  const dispatch = useSourceDispatch();
  const { toggleSettings, settingsOpen } = useSettings();
  const { phase } = useOutput();
  const generate = useGenerate();

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-cs-edge bg-cs-surface px-5 py-2.5 shadow-cs-soft">
      {/* Source tabs (.source-tabs / .stab, lines 112-116) */}
      <div
        role="tablist"
        aria-label="Source"
        className="flex shrink-0 overflow-hidden rounded-cs-card border-[1.5px] border-cs-edge2 shadow-cs-soft"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={mode === t.id}
            onClick={() => dispatch({ type: "setMode", mode: t.id })}
            className={cn(
              "flex cursor-pointer items-center gap-[5px] px-3.5 py-[7px] font-cs-sans text-cs-ui font-semibold transition-all duration-150",
              i < TABS.length - 1 && "border-r-[1.5px] border-cs-edge2",
              mode === t.id
                ? "bg-cs-accent text-white"
                : "bg-cs-surface text-cs-t2 hover:bg-cs-abg hover:text-cs-accent",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Selected source */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-cs-label font-bold tracking-[.08em] text-cs-t3 uppercase">
          Selected source
        </div>
        <div className="max-w-[520px] overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-cs-ink">
          {selectedArticle?.title ?? "Pick an article or enter a topic to get started"}
        </div>
      </div>

      <Button
        onClick={toggleSettings}
        className={settingsOpen ? "border-cs-accent bg-cs-abg text-cs-accent" : undefined}
      >
        <Settings aria-hidden className="size-3.5 shrink-0" />
        Settings
        {settingsOpen ? (
          <ChevronUp aria-hidden className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown aria-hidden className="size-3.5 shrink-0" />
        )}
      </Button>

      <GenerateButton
        disabled={phase === "generating" || !selectedArticle}
        onClick={() => generate()}
      >
        <Zap aria-hidden className="size-3.5 shrink-0 fill-current" />
        Generate + Fact-Check
      </GenerateButton>
    </div>
  );
}
