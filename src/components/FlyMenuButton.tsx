"use client";

import { useFlyMenu } from "@/components/FlyMenuContext";

/** Hamburger button that opens/closes the fly-out menu. Must be inside FlyMenuProvider. */
export function FlyMenuButton() {
  const { toggle } = useFlyMenu();
  return (
    <button
      type="button"
      className="mvp-fly-but-wrap mvp-fly-but-click left relative"
      onClick={toggle}
      aria-label="Open menu"
    >
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </button>
  );
}
