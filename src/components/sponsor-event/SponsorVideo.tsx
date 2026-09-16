"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SponsorVideoSpec } from "./backgrounds";
import { useReducedMotion } from "./hooks";

/** A muted, looping background clip that degrades to its poster still.
 *
 * - The poster is painted as the wrapper's own background, so it is on screen before the video
 *   element has any data, and it stays on screen if the clip is missing or fails — `onError`
 *   removes the <video> entirely rather than leaving a broken black box.
 * - The clip's `src` is only attached once the wrapper is within ~240px of the viewport (hero:
 *   `eager`), so the four clips below the fold cost nothing until the reader gets near them.
 * - Playback follows visibility: it plays while in view and pauses once scrolled past.
 * - The video fades in over its poster once its first frame is decoded, so the swap never pops.
 * - `muted` + `playsInline` are required for inline autoplay on iOS/Chrome; `muted` is also set as
 *   a property before each play() because React does not reliably reflect the attribute.
 * - Under reduced motion it never starts (and holds on the poster/first frame) unless the reader
 *   explicitly pressed play somewhere — `ignoreReducedMotion`. */
export function SponsorVideo({
  video,
  className,
  eager = false,
  playing = true,
  ignoreReducedMotion = false,
}: {
  video: SponsorVideoSpec;
  className?: string;
  /** Attach the source immediately — only for the clip that is on screen at load. */
  eager?: boolean;
  /** Externally controlled play state (the reel's play/pause button). */
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
      // A rejected play() (autoplay policy, data saver) simply leaves the poster/first frame up.
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
      className={"sp-video" + (className ? ` ${className}` : "")}
      style={{ backgroundImage: `url("${video.poster}")` }}
      aria-hidden="true"
    >
      {!failed && (
        <video
          ref={videoRef}
          className={"sp-video-el" + (ready ? " is-ready" : "")}
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
