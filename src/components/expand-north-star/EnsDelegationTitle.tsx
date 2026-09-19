"use client";

import { useEffect, useState } from "react";

/** The band at the very top: "Startup Delegation to Dubai", set still, as wide as the band
 * (the type is sized to the band's width — see `.ens-delegation-title`), and sticky, so it stays on
 * screen through the whole page with the event bar pinned directly beneath it.
 *
 * It replaced the green running strip on request (2026-09-17). Once the page has scrolled, the
 * band tightens its padding so the pinned stack takes less of the screen; EnsNav measures the band
 * and follows its height.
 *
 * A heading element is not used on purpose — the hero owns the page's h1 and the delegation
 * programme section already has an h2 with these same words — so it is a paragraph, read once. The
 * line stays whole at every width, including phones (on request, 2026-09-19) — `.ens-delegation-line`
 * is a bare span now, kept only so the CSS class exists if a future change needs to target the two
 * halves separately. */
export function EnsDelegationTitle() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={"ens-delegation-band" + (scrolled ? " is-scrolled" : "")}>
      <p className="ens-delegation-title">
        <span className="ens-delegation-line">Startup</span>{" "}
        <span className="ens-delegation-line">
          Delegation <span className="ens-delegation-accent">to Dubai</span>
        </span>
      </p>
    </div>
  );
}
