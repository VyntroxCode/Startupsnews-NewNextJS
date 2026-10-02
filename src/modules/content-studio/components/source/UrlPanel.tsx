"use client";

import { useState } from "react";
import { CircleX, TriangleAlert, Zap } from "lucide-react";

import { Button, Spinner, TextInput } from "@/modules/content-studio/components/ui";
import { useSource, useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useImportUrl } from "@/modules/content-studio/lib/hooks/useFetchers";
import { useGenerate } from "@/modules/content-studio/lib/hooks/useGenerate";

// ── URL IMPORT (content-studio-v17.html:510-529) ──
export function UrlPanel() {
  const { urlArticle, urlFetching, urlError } = useSource();
  const dispatch = useSourceDispatch();
  const importUrl = useImportUrl();
  const generate = useGenerate();
  const [input, setInput] = useState("");

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-cs-edge px-3.5 py-3">
      <div className="flex gap-[7px]">
        <TextInput
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && importUrl(input)}
          placeholder="Paste any article URL..."
        />
        <Button
          variant="primary"
          size="sm"
          disabled={urlFetching}
          onClick={() => importUrl(input)}
        >
          {urlFetching ? <Spinner size="sm" /> : null}
          Fetch
        </Button>
      </div>

      <div className="text-cs-meta text-cs-t3">
        Paste a full URL (https://...) — the model will rewrite it as fresh SEO
        content.
      </div>

      {urlError ? (
        <>
          <div className="rounded-cs-card border border-cs-warn/20 bg-cs-warnbg px-2.5 py-1.5 text-cs-meta leading-[1.5] text-cs-warn">
            <TriangleAlert aria-hidden className="mr-1 inline-block size-3 align-[-2px]" />
            Some sites block automated fetching. If fetch fails, copy the
            article text and use the <strong>Topic</strong> tab instead — paste
            the content as context there.
          </div>
          <div className="flex items-center gap-[7px] rounded-cs-card bg-cs-badbg px-2.5 py-[7px] text-cs-meta text-cs-bad">
            <CircleX aria-hidden className="size-3.5 shrink-0" />
            {urlError}
          </div>
        </>
      ) : null}

      {urlArticle ? (
        <div className="rounded-r-cs-card border-l-[3px] border-cs-accent bg-gradient-to-br from-cs-abg to-[#f5f7fd] px-3.5 py-[11px] shadow-cs-soft">
          <div className="mb-[3px] text-cs-label font-bold tracking-[.05em] text-cs-accent uppercase">
            {urlArticle.source}
          </div>
          <div className="mb-[5px] text-cs-ui leading-[1.4] font-semibold text-cs-ink">
            {urlArticle.title}
          </div>
          <div className="line-clamp-2 mb-[9px] text-cs-meta text-cs-t2">{urlArticle.desc}</div>
          <div className="flex gap-[7px]">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                dispatch({ type: "selectArticle", article: urlArticle });
                void generate(urlArticle);
              }}
            >
              <Zap aria-hidden className="size-3 shrink-0 fill-current" />
              Generate
            </Button>
            <Button size="sm" onClick={() => dispatch({ type: "clearUrlCard" })}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
