/** The two background clips that sit behind the page's dark sections (the hero and the ecosystem
 * block). They are BACKGROUNDS, not content: each one is muted, looping, dimmed and washed with a
 * scrim so the white type over it keeps its contrast, and each is marked `aria-hidden` because the
 * sections say everything the footage does.
 *
 * Both files were LOOKED AT before being wired in — frames were pulled out of each clip and
 * viewed, the same rule this repo applies to photographs (see the note at the top of
 * `press-release-submit/images.ts`). What is actually on screen is described below.
 *
 * These replaced the Unsplash stills that were here first, on request. Swapping either one should
 * mean editing this file and nothing else. They are local files under `public/images/gif/`, so
 * they are served straight from the origin — no next/image, which does not process video. */
export interface BackgroundVideo {
  src: string;
  /** What is in the footage — for the next person choosing a replacement, not for the DOM. */
  subject: string;
  /** How much of the clip's own brightness survives the scrim over it. Tuned per clip: the two
   * are nowhere near the same exposure. */
  opacity: number;
  /** Optional still shown before the first frame decodes — and left up if `src` 404s. Neither
   * clip on this page sets one; /sponsor-event's hero does. */
  poster?: string;
}

export const featureStartupBackgrounds = {
  /** Hero. Four people in business dress walking together on a bright terrace, trees and a city
   * building behind them. Shot in full daylight — by far the brighter of the two, so it still
   * takes the heavier of the two scrims, but it runs near full strength under it: at a third
   * opacity the footage disappeared into the dark field and the section read as flat black. */
  hero: {
    src: "/images/gif/46285-446732353_medium.mp4",
    subject: "Four people walking together on a sunlit terrace, city greenery behind",
    opacity: 0.72,
  },
  /** Ecosystem. A dotted digital globe turning against black, its landmasses picked out in pink,
   * magenta and blue points of light. It is nearly black already and its palette is this page's
   * own, which is why it runs undimmed and is graded UP in CSS rather than down — and it says
   * "one story, many places" better than the still it replaced. */
  ecosystem: {
    src: "/images/gif/1992-153555258_medium.mp4",
    subject: "A dotted digital globe turning against black, lit in pink and blue",
    opacity: 1,
  },
} as const satisfies Record<string, BackgroundVideo>;
