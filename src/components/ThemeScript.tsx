"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    const backToTop = (e: Event) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const onBodyClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(".back-to-top")) {
        backToTop(e);
      }
    };

    document.body.addEventListener("click", onBodyClick);

    return () => {
      document.body.removeEventListener("click", onBodyClick);
    };
  }, []);

  return null;
}
