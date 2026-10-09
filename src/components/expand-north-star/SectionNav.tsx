"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { leadPageFont } from "@/lib/lead-page-font";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, type Variants } from "motion/react";
import { EASE, scrollToSection, useReducedMotion } from "./hooks";

/** The sections the quick nav jumps to, in page order. Each id sits on its section's own element. */
const SECTIONS = [
  { id: "ens-days", label: "Itinerary" },
  { id: "ens-benefits", label: "Benefits" },
  { id: "ens-fee", label: "Participate Now" },
  { id: "ens-participate", label: "Kick Start" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** The nav appears once the reader has scrolled this far into the page (a fraction of the viewport). */
const SHOW_AFTER = 0.6;

/** A section counts as the current one once its top passes this line (a fraction of the viewport). */
const SPY_LINE = 0.45;

function HomeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
    </svg>
  );
}

/** Tracks whether the nav should be showing and which section the reader is in. */
function useSectionSpy() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);

  const update = useCallback(() => {
    const vh = window.innerHeight;
    setVisible(window.scrollY > vh * SHOW_AFTER);
    let current: SectionId | null = null;
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= vh * SPY_LINE) current = id;
    }
    setActive(current);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  useMotionValueEvent(scrollY, "change", update);

  return { visible, active };
}

/* ---- Desktop: floating dock ------------------------------------------------------------------- */

const dockVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.94, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE, delayChildren: 0.12, staggerChildren: 0.06 },
  },
  exit: { opacity: 0, y: 30, scale: 0.96, filter: "blur(6px)", transition: { duration: 0.4, ease: EASE } },
};

const dockItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function Dock({ active, reducedMotion }: { active: SectionId | null; reducedMotion: boolean }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });

  return (
    <motion.nav
      aria-label="Page sections"
      className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 lg:block"
      variants={dockVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="show"
      exit={reducedMotion ? undefined : "exit"}
    >
      <div className="relative flex items-center gap-1 overflow-hidden rounded-full border border-white/10 bg-ens-navy/85 p-1.5 shadow-[0_18px_50px_-18px_rgba(14,26,51,0.75)] backdrop-blur-xl">
        {SECTIONS.map((section) => {
          const isActive = active === section.id;
          return (
            <motion.a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => scrollToSection(e, section.id, reducedMotion)}
              aria-current={isActive ? "true" : undefined}
              className="group/dock relative block rounded-full no-underline"
              variants={dockItemVariants}
            >
              {isActive && (
                <motion.span
                  layoutId="ens-dock-active"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-ens-pink shadow-[0_6px_18px_-6px_rgba(228,21,124,0.8)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {/* Colour lives on the span: the site-wide `a, a:visited` rule outranks a utility on the link. */}
              <span
                className={`relative block rounded-full px-4 py-2 text-[14px] font-semibold whitespace-nowrap transition-colors duration-300 xl:px-5 ${
                  isActive ? "text-white" : "text-white/70 group-hover/dock:bg-white/10 group-hover/dock:text-white"
                }`}
              >
                {section.label}
              </span>
            </motion.a>
          );
        })}

        <motion.span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15" variants={dockItemVariants} />

        <motion.div variants={dockItemVariants}>
          <Link href="/" className="group/dock block rounded-full no-underline">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold whitespace-nowrap text-ens-navy transition-[background-color,translate] duration-300 group-hover/dock:-translate-y-px group-hover/dock:bg-ens-gold-soft">
              <HomeIcon className="size-4 text-ens-pink" />
              Back to Home
            </span>
          </Link>
        </motion.div>

        {/* Reading progress along the dock's bottom edge. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 bottom-0 h-[2px] origin-left rounded-full bg-linear-to-r from-ens-pink to-ens-gold-soft"
          style={{ scaleX: progress }}
        />
      </div>
    </motion.nav>
  );
}

/* ---- Mobile / tablet: button + right-hand sidebar ---------------------------------------------- */

const panelItemsVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.07 } },
};

const panelItemVariants: Variants = {
  hidden: { opacity: 0, x: 36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

function Sidebar({
  visible,
  active,
  reducedMotion,
}: {
  visible: boolean;
  active: SectionId | null;
  reducedMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  // The panel is portalled to <body> (see below), which only exists once mounted.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // While open: lock the page behind, close on Escape, keep Tab inside the panel.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a, button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    // Unlock first so the smooth scroll isn't fighting the lock, then close the panel.
    document.body.style.overflow = "";
    scrollToSection(e, id, reducedMotion);
    setOpen(false);
  };

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {(visible || open) && (
          <motion.button
            ref={triggerRef}
            type="button"
            aria-label="Open page sections"
            aria-expanded={open}
            aria-controls="ens-section-sidebar"
            onClick={() => setOpen(true)}
            className="fixed right-[9px] bottom-[calc(122px+env(safe-area-inset-bottom,0px))] z-50 flex size-14 cursor-pointer items-center justify-center rounded-full border-0 bg-ens-pink text-white shadow-[0_14px_34px_-10px_rgba(228,21,124,0.75)] active:scale-95"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.4, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.4, rotate: 90 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
          >
            {!reducedMotion && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-ens-pink"
                animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="relative size-6" aria-hidden="true">
              <path d="M4 7h16M4 12h16M10 17h10" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Portalled to the end of <body> at z 10000. Inside the page it would share #mvp-site-main's
          z-index 9999 stack, and the site-wide up/down ScrollButtons (also 9999, mounted later)
          would float over the open panel. The font is set here because the portal sits outside
          `.ens-page`. */}
      {portalReady &&
        createPortal(
          <div className={`relative z-[10000] font-[family-name:var(--lead-font),Helvetica,Arial,sans-serif] antialiased lg:hidden ${leadPageFont.variable}`}>
            <AnimatePresence>
              {open && (
                <>
                  <motion.div
                    aria-hidden="true"
                    className="fixed inset-0 z-[60] bg-ens-navy/55 backdrop-blur-sm"
                    onClick={close}
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reducedMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  />
                  <motion.div
                    ref={panelRef}
                    id="ens-section-sidebar"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Page sections"
                    className="fixed inset-y-0 right-0 z-[70] flex w-[84vw] max-w-sm flex-col bg-white shadow-[-24px_0_60px_-20px_rgba(14,26,51,0.45)]"
                    initial={reducedMotion ? false : { x: "100%" }}
                    animate={{ x: 0 }}
                    exit={reducedMotion ? undefined : { x: "100%" }}
                    transition={{ type: "spring", stiffness: 320, damping: 36 }}
                  >
                    <div className="flex items-center justify-between border-b border-ens-cream-line px-6 py-5">
                      <p className="m-0 text-[22px] leading-none font-extrabold tracking-[-0.01em] text-ens-pink">Attend</p>
                      <button
                        ref={closeRef}
                        type="button"
                        aria-label="Close page sections"
                        onClick={close}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-ens-cream text-ens-ink transition-[background-color,rotate] duration-300 hover:rotate-90 hover:bg-ens-cream-line"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-5" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>

                    <motion.ul
                      className="m-0 flex list-none flex-col gap-1 p-4"
                      variants={panelItemsVariants}
                      initial={reducedMotion ? false : "hidden"}
                      animate="show"
                    >
                      {SECTIONS.map((section) => {
                        const isActive = active === section.id;
                        return (
                          <motion.li key={section.id} variants={panelItemVariants}>
                            <a
                              href={`#${section.id}`}
                              onClick={(e) => go(e, section.id)}
                              aria-current={isActive ? "true" : undefined}
                              className="group/side block rounded-2xl no-underline"
                            >
                              <span
                                className={`flex items-center justify-between rounded-2xl px-4 py-4 text-[17px] font-bold transition-colors duration-300 ${
                                  isActive ? "bg-ens-pink/10 text-ens-pink" : "text-ens-ink group-hover/side:bg-ens-cream"
                                }`}
                              >
                                <span className="flex items-center gap-3">
                                  <span
                                    aria-hidden="true"
                                    className={`size-2 rounded-full transition-colors duration-300 ${isActive ? "bg-ens-pink" : "bg-ens-cream-line"}`}
                                  />
                                  {section.label}
                                </span>
                                <svg
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="size-4 opacity-50 transition-transform duration-300 group-hover/side:translate-x-1"
                                  aria-hidden="true"
                                >
                                  <path d="M4 10h12M11 5l5 5-5 5" />
                                </svg>
                              </span>
                            </a>
                          </motion.li>
                        );
                      })}
                    </motion.ul>

                    <motion.div
                      className="mt-auto border-t border-ens-cream-line p-4"
                      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
                    >
                      <Link href="/" className="block rounded-full no-underline">
                        <span className="flex items-center justify-center gap-2 rounded-full bg-ens-navy px-5 py-3.5 text-[15px] font-bold text-white">
                          <HomeIcon className="size-4 text-ens-gold-soft" />
                          Back to Home
                        </span>
                      </Link>
                    </motion.div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </div>
  );
}

/** Quick section nav for the event page: Itinerary, Benefits, Participate Now (the fee section), Kick Start
 * (the enquiry form) and Back to Home.
 *
 * Desktop (≥1024px): a floating navy dock pinned to the bottom centre that rises in once the reader
 * is past the hero and travels with the scroll; a pink pill slides to whichever section is in view
 * and a thin line along the dock fills with reading progress. Below 1024px: a pink round button
 * (bottom right, stacked above the site-wide up/down ScrollButtons, with a soft pulse) opens a right-hand sidebar listing the same sections; tapping
 * one closes the sidebar and scrolls there. Every jump goes through `scrollToSection`, so it clears
 * the pinned delegation band and event bar. Tailwind utilities only. */
export function SectionNav() {
  const reducedMotion = useReducedMotion();
  const { visible, active } = useSectionSpy();

  return (
    <>
      <AnimatePresence>{visible && <Dock key="dock" active={active} reducedMotion={reducedMotion} />}</AnimatePresence>
      <Sidebar visible={visible} active={active} reducedMotion={reducedMotion} />
    </>
  );
}
