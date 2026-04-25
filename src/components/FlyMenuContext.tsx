"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

type FlyMenuContextType = {
  open: boolean;
  toggle: () => void;
};

const FlyMenuContext = createContext<FlyMenuContextType | null>(null);

export function useFlyMenu() {
  const ctx = useContext(FlyMenuContext);
  if (!ctx) throw new Error("useFlyMenu must be used within FlyMenuProvider");
  return ctx;
}

export function FlyMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const wrap = document.getElementById("mvp-fly-wrap");
    const fade = document.querySelector(".mvp-fly-fade");
    const site = document.getElementById("mvp-site");
    const wall = document.getElementById("mvp-site-wall");
    
    if (open) {
      if (wrap) wrap.classList.add("mvp-fly-open");
      if (site) site.classList.add("mvp-fly-open");
      if (wall) wall.classList.add("mvp-fly-open");
    } else {
      if (wrap) wrap.classList.remove("mvp-fly-open");
      if (site) site.classList.remove("mvp-fly-open");
      if (wall) wall.classList.remove("mvp-fly-open");
    }

    document.querySelectorAll(".mvp-fly-but-wrap").forEach((el) => {
      if (open) {
          el.classList.add("mvp-fly-open");
      } else {
          el.classList.remove("mvp-fly-open");
      }
    });
    
    if (fade) {
      if (open) {
          fade.classList.add("mvp-fly-fade-out"); // Assuming fade-out means visible/active in Zox context or we need to check CSS
          // Actually, let's stick to a standard class like 'visible' or check what Zox uses.
          // Looking at style.css, it had .mvp-fly-fade but didn't show the active state class clearly in the small snippet.
          // Let's rely on standard logic:
          fade.classList.add("mvp-fly-fade-active"); 
      } else {
          fade.classList.remove("mvp-fly-fade-active");
      }
    }
  }, [open]);

  return (
    <FlyMenuContext.Provider value={{ open, toggle }}>
      {children}
    </FlyMenuContext.Provider>
  );
}
