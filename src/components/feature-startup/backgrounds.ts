/** The background clip that sits behind the hero, the page's one dark section. It is a BACKGROUND,
 * not content: muted, looping, dimmed and washed with a scrim so the white type over it keeps its
 * contrast, and marked `aria-hidden` because the section says everything the footage does.
 *
 * The file was LOOKED AT before being wired in — frames were pulled out of the clip and viewed,
 * the same rule this repo applies to photographs (see the note at the top of
 * `press-release-submit/images.ts`).
 *
 * This replaced an Unsplash still first, then a second clip (four people on a sunlit terrace) that
 * used to sit here while the connector-graph animation lived in its own "Ecosystem" section further
 * down the page — that section was folded into the hero on request, and its globe clip came with
 * it since the graph was designed against it. Swapping the clip should mean editing this file and
 * nothing else. It is a local file under `public/images/gif/`, so it is served straight from the
 * origin — no next/image, which does not process video. */
export interface BackgroundVideo {
  src: string;
  /** What is in the footage — for the next person choosing a replacement, not for the DOM. */
  subject: string;
  /** How much of the clip's own brightness survives the scrim over it. */
  opacity: number;
  /** Optional still shown before the first frame decodes — and left up if `src` 404s. This clip
   * does not set one; /sponsor-event's hero does. */
  poster?: string;
}

export const featureStartupBackgrounds = {
  /** Hero. A dotted digital globe turning against black, its landmasses picked out in pink,
   * magenta and blue points of light. It is nearly black already and its palette is this page's
   * own, which is why it runs undimmed and is graded UP in CSS rather than down. */
  hero: {
    src: "/images/gif/1992-153555258_medium.mp4",
    subject: "A dotted digital globe turning against black, lit in pink and blue",
    opacity: 1,
  },
} as const satisfies Record<string, BackgroundVideo>;
