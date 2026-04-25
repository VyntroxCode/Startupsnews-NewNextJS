"use client";

import { useFlyMenu } from "@/components/FlyMenuContext";

/** Fade overlay behind fly menu; click to close. Must be inside FlyMenuProvider. */
export function FlyMenuFade() {
  const { toggle } = useFlyMenu();
  return (
    <div
      className="mvp-fly-fade mvp-fly-but-click"
      onClick={toggle}
      onKeyDown={(e) => e.key === "Enter" && toggle()}
      role="button"
      tabIndex={0}
      aria-label="Close menu"
    />
  );
}
