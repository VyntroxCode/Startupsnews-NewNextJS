/** The clip that sits behind the hero. It is a BACKGROUND, not content: muted, looping, dimmed
 * and washed with a scrim so the white type over it keeps its contrast, and marked `aria-hidden`
 * because the hero says everything the footage does.
 *
 * This replaced the Unsplash still that was here first, on request — the same move
 * /feature-your-startup made (see `feature-startup/backgrounds.ts`), and it reuses that page's
 * `BackgroundVideo` component so both behave identically: playback is tied to visibility, and
 * under reduced motion the clip never starts and holds on its poster frame.
 *
 * TO REPLACE THE FOOTAGE: drop an .mp4 at `public/images/gif/` and point `src` below at it.
 * Nothing else on the page needs editing. Local files are served straight from the origin —
 * no next/image, which does not process video.
 *
 * `poster` is what shows before the first frame decodes, and what stays on screen if the file at
 * `src` is missing — so the hero is never a black rectangle while the clip is being swapped. It
 * comes from eventImages.ts like every other still on the page, rather than being a second URL
 * to keep in sync. */
import { eventImages } from "./eventImages";

export interface SponsorBackgroundVideo {
  src: string;
  /** What is in the footage — for the next person choosing a replacement, not for the DOM. */
  subject: string;
  /** How much of the clip's own brightness survives the scrim over it. */
  opacity: number;
  poster?: string;
}

export const sponsorEventBackgrounds = {
  /** 01 — Hero. Awaiting the event clip that will be uploaded to the path below; until that file
   * exists the poster still carries the section, which is the point of having one. Keep it wide
   * and dark enough in its own right that white type sits comfortably on top. */
  hero: {
    src: "/images/gif/sponsor-event-hero.mp4",
    subject: "Event footage — a crowd at a startup or technology event",
    opacity: 0.9,
    poster: eventImages.hero.src,
  },
} as const satisfies Record<string, SponsorBackgroundVideo>;
