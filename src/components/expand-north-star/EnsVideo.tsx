"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnsVideoSpec } from "./media";
import { useReducedMotion } from "./hooks";

/** A muted, looping clip that degrades to its poster still — the same contract as
 * src/components/sponsor-event/SponsorVideo.tsx:
 *
 * - the poster is the wrapper's own background, on screen before the video has data and left up
 *   if the clip fails (`onError` removes the <video> rather than leaving a black box);
 * - `src` is attached only once the wrapper is within ~240px of the viewport (`eager` for the hero);
 * - playback follows visibility, and the video fades in over its poster once a frame is decoded;
 * - under reduced motion it never starts unless the reader pressed play (`ignoreReducedMotion`). */
export function EnsVideo({
  video,
  className,
  eager = false,
  playing = true,
  ignoreReducedMotion = false,
}: {
  video: EnsVideoSpec;
  className?: string;
  eager?: boolean;
  /** Externally controlled play state (the hero's pause button). */
  playing?: boolean;
  ignoreReducedMotion?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(false);
  const [near, setNear] = useState(eager);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const shouldPlay = playing && (ignoreReducedMotion || !reducedMotion);

  const sync = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView.current && shouldPlay) {
      el.muted = true;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [shouldPlay]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting) setNear(true);
        sync();
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [sync]);

  return (
    <div
      ref={wrapRef}
      className={"ens-video" + (className ? ` ${className}` : "")}
      style={{ backgroundImage: `url("${video.poster}")` }}
      aria-hidden="true"
    >
      {!failed && (
        <video
          ref={videoRef}
          className={"ens-video-el" + (ready ? " is-ready" : "")}
          src={near ? video.src : undefined}
          muted
          loop
          playsInline
          preload={near ? "auto" : "none"}
          tabIndex={-1}
          onLoadedData={() => {
            setReady(true);
            sync();
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
