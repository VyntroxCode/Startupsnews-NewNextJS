"use client";

import { getAuthHeaders } from "@/lib/admin-auth";
import { useCallback, useRef } from "react";

import { useOutputDispatch, useSettings, useSource, useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { TEMPLATES } from "@/modules/content-studio/lib/data/templates";
import type { Article, GenerateEvent } from "@/modules/content-studio/types";

/**
 * Drives POST /api/generate and reads its SSE stream.
 *
 * `fetch` + a body reader rather than EventSource, because EventSource cannot
 * issue a POST. The 6-step checklist is fed by real server events, so it no
 * longer needs the cosmetic `await delay(300)` padding the original used
 * (content-studio-v17.html:1715, 1750).
 */
export function useGenerate() {
  const source = useSource();
  const sourceDispatch = useSourceDispatch();
  const outputDispatch = useOutputDispatch();
  const settings = useSettings();
  const toast = useToast();
  const inFlight = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (override?: Article) => {
      const article = override ?? source.selectedArticle;
      if (!article) {
        toast("Please select an article or enter a topic first", "warning");
        return;
      }

      // A second click supersedes the first rather than racing it.
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;

      outputDispatch({ type: "start" });
      sourceDispatch({ type: "setStatus", text: "Generating…", loading: true });

      try {
        const res = await fetch("/api/admin/content-studio/generate", {
          method: "POST",
          headers: getAuthHeaders(),
          signal: ctrl.signal,
          body: JSON.stringify({
            article,
            settings: settings.generateSettings,
            author: settings.selectedAuthor,
            recentHeadlines: settings.recentHeadlines,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Generation failed (HTTP ${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;

            let evt: GenerateEvent;
            try {
              evt = JSON.parse(line.slice(5).trim()) as GenerateEvent;
            } catch {
              continue;
            }

            if (evt.type === "step") {
              outputDispatch({ type: "step", step: evt.step, label: evt.label });
            } else if (evt.type === "done") {
              outputDispatch({ type: "done", data: evt.data });
              settings.rememberHeadline(evt.data.headline);
              const label = TEMPLATES[settings.templateId]?.label ?? "";
              sourceDispatch({
                type: "setStatus",
                text: `Generated — ${label}`,
              });
              toast(`Generated — ${label}`, "success");
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          }
        }
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Generation failed";
        outputDispatch({ type: "failed", message });
        sourceDispatch({ type: "setStatus", text: "Generation failed" });
        toast("Error: " + message, "error");
      } finally {
        if (inFlight.current === ctrl) inFlight.current = null;
      }
    },
    [source.selectedArticle, sourceDispatch, outputDispatch, settings, toast],
  );

  return generate;
}
