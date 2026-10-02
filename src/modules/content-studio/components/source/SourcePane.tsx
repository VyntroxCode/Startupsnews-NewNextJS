"use client";

import { StatusBar } from "@/modules/content-studio/components/shell/Chrome";
import { useSource } from "@/modules/content-studio/lib/state/StudioProvider";
import { UrlPanel } from "./UrlPanel";
import { TopicPanel } from "./TopicPanel";
import { NewsPanel } from "./NewsPanel";

// ── LEFT COLUMN (content-studio-v17.html:507-605) ──
// The 320px rail. NewsPanel stays mounted but hidden so its scroll position
// and fetched list survive a tab round-trip; the others are cheap to remount.
export function SourcePane() {
  const { mode } = useSource();

  return (
    <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-cs-edge bg-cs-surface">
      {mode === "url" ? <UrlPanel /> : null}
      {mode === "topic" ? <TopicPanel /> : null}
      <NewsPanel hidden={mode !== "news"} />
      <StatusBar />
    </div>
  );
}
