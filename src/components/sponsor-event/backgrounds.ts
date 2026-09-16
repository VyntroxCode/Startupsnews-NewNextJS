/** ============================================================================
 *  VIDEO — SINGLE SOURCE OF TRUTH
 *  ============================================================================
 *
 *  Every clip on /sponsor-event is declared here and nowhere else. They are
 *  BACKGROUNDS, not content: muted, looping, `aria-hidden`, and always sitting
 *  under a scrim so the type over them keeps its contrast.
 *
 *  Source: Mixkit (mixkit.co), free licence — usable in commercial projects
 *  without attribution. The 720p files were downloaded into
 *  `public/images/sponsor-event/video/` so the page never depends on a third-party
 *  host at runtime. Each `poster` is Mixkit's own thumbnail frame of that same
 *  clip, saved to `public/images/sponsor-event/`; it shows before the first
 *  frame decodes and STAYS UP if the clip fails to load (see SponsorVideo.tsx),
 *  so no section is ever a black rectangle.
 *
 *  Every clip was LOOKED AT (a thumbnail contact sheet, 2026-09-15) before being
 *  wired in — the `subject` lines describe what is actually in the footage. It
 *  is stock footage: nothing on the page captions it as a StartupNews.fyi event.
 *
 *  TO REPLACE A CLIP: drop the new .mp4 + a poster .jpg under the two folders
 *  above using the same file names, or point `src` / `poster` at new paths.
 *  Nothing else on the page needs editing. Note that `next start` only serves
 *  files that were in `public/` at build time.
 */

export interface SponsorVideoSpec {
  src: string;
  poster: string;
  /** What is in the footage — for the next person choosing a replacement, not for the DOM. */
  subject: string;
}

/** Clips live under `/images/` on purpose, not `/videos/`: src/proxy.ts's matcher skips `images`
 * but not `videos`, so a `/videos/...` file would run the post-robots lookup (an internal API call)
 * on every byte-range request the browser makes while streaming. */
const clip = (name: string) => ({
  src: `/images/sponsor-event/video/${name}.mp4`,
  poster: `/images/sponsor-event/${name}-poster.jpg`,
});

export const sponsorVideos = {
  /** Hero background. */
  hero: {
    ...clip("hero-crowd"),
    subject: "A packed arena crowd with hands raised in front of large stage screens (Mixkit 25366)",
  },
  /** The rounded "inside the room" video card under the hero. */
  reel: {
    ...clip("reel-stage"),
    subject: "A speaker holding notes on a dark stage under bright stage lights (Mixkit 13222)",
  },
  /** Background of the Community panel in "Why partner". */
  community: {
    ...clip("community-toast"),
    subject: "A group raising glasses together at an evening gathering (Mixkit 48636)",
  },
  /** Background of the big "Bring the right people into the room" break. */
  room: {
    ...clip("break-speaker"),
    subject: "A speaker on stage, arms open to the audience, through stage haze (Mixkit 36901)",
  },
} satisfies Record<string, SponsorVideoSpec>;
