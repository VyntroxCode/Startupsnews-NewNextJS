"use client";

import { useEffect, useRef } from "react";
import type { BackgroundVideo as BackgroundVideoSpec } from "./backgrounds";
import { useReducedMotion } from "./hooks";

/** A muted, looping clip behind a dark section, plus the scrim that keeps type readable over it.
 *
 * Why a plain <video> and not next/image: next/image does not process video. These are local 720p
 * files under public/, so they stream straight from the origin.
 *
 * `muted` + `playsInline` are not optional: without both, iOS refuses to autoplay inline and
 * Chrome refuses to autoplay at all, which would leave the section sitting on a black frame.
 *
 * Playback is tied to visibility rather than left running: the ecosystem clip is ~10MB and sits
 * well below the fold, so it neither downloads nor decodes until the reader is actually near it,
 * and it stops again once they scroll past. Under reduced motion it never starts at all and holds
 * on its first frame — the sections are designed against a picture, so removing it entirely would
 * change their contrast, but nothing moves.
 *
 * A spec may carry a `poster`, which is what shows before the first frame decodes and what stays
 * on screen if the file at `src` is missing — so a section is never a black rectangle while its
 * clip is being swapped. /sponsor-event's hero uses it; the clips on this page do not need one. */
export function BackgroundVideo({
  video,
  className,
  scrimClassName,
  preload = "metadata",
}: {
  video: BackgroundVideoSpec;
  className: string;
  scrimClassName: string;
  /** "auto" for the hero, which is on screen at load; leave the default for anything below it. */
  preload?: "auto" | "metadata" | "none";
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  // `useReducedMotion` is hydration-safe: it reports false on the server and corrects itself on
  // mount, so playback has to be driven here rather than by withholding an autoPlay attribute.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      el.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // A rejected play() is not worth surfacing — a policy-blocked clip simply holds on its
          // first frame, which is where reduced motion leaves it too.
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <>
      <video
        ref={ref}
        className={className}
        src={video.src}
        poster={video.poster}
        style={{ opacity: video.opacity }}
        muted
        loop
        playsInline
        preload={preload}
        aria-hidden="true"
        tabIndex={-1}
      />
      <span className={scrimClassName} />
    </>
  );
}
