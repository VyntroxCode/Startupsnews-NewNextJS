"use client";

import { studioFontVars } from "./fonts";
import { StudioProvider } from "@/modules/content-studio/lib/state/StudioProvider";
import { ApiStatusRow, StorageBlockedBanner, TopNav } from "./Chrome";
import {
  SettingsBar,
  SettingsToggle,
} from "@/modules/content-studio/components/settings/SettingsBar";
import { GenerateBar } from "@/modules/content-studio/components/genbar/GenerateBar";
import { SourcePane } from "@/modules/content-studio/components/source/SourcePane";
import { ReaderPane } from "@/modules/content-studio/components/output/ReaderPane";

/**
 * The whole interactive app.
 *
 * Everything below here is a client component: this is a live editor with no
 * server-rendered content, so a finer boundary would be ceremony. The one real
 * win from the boundary is security — `app/page.tsx` reads the env on the
 * server and passes down only a boolean and the deployment name, so the key
 * never enters the client bundle.
 *
 * The `flex-1 min-h-0` chain below is load-bearing: drop one and the two
 * independent scroll regions collapse into a single page scroll.
 *
 * Inside the admin panel the root fills the viewport under the 60px admin header (the layout drops
 * its content padding on this route), so only the two panes scroll, as in the standalone app.
 */
export function StudioShell({
  configured,
  model,
}: {
  configured: boolean;
  model: string;
}) {
  return (
    <div
      className={`${studioFontVars} content-studio-scope flex h-[calc(100dvh-60px)] flex-col overflow-hidden bg-cs-bg font-cs-sans text-sm leading-[1.6] text-cs-ink`}
    >
      <StudioProvider>
        <TopNav />
        <ApiStatusRow configured={configured} model={model} />
        <StorageBlockedBanner />
        <SettingsToggle />
        <SettingsBar />
        <GenerateBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SourcePane />
          <ReaderPane />
        </div>
      </StudioProvider>
    </div>
  );
}
