import Link from 'next/link';
import { Crown } from 'lucide-react';

/**
 * Floating "Get Pro Plan" bubble on every /dashboard/funding/* page; opens /dashboard/pro.
 * Fixed to the right edge, above the site's scroll-to-top / scroll-to-bottom buttons.
 *
 * Layers, outside in (animations are the fi-bubble-* tokens in isolated-tailwind.css):
 *   wrapper  stays put at its fixed spot (no drift), so one click always lands on the bubble.
 *   link     pops in once, grows a little on hover, dips on press.
 *   rings    two outlines that swell and fade, half a cycle apart.
 *   glow     a blurred copy of the gradient that breathes behind the bubble.
 *   body     the gradient circle: a slow turning sheen, a light band sweeping across, and a
 *            fixed gloss highlight at the top left.
 * Everything stands still under prefers-reduced-motion.
 */
export default function ProPlanBubble() {
  return (
    <div className="group/bubble fixed bottom-[156px] right-3 z-[100] sm:right-6">
      <Link
        href="/dashboard/pro"
        aria-label="Get Pro Plan, lifetime access"
        className="relative flex size-[76px] animate-fi-bubble-in items-center justify-center rounded-full text-white no-underline outline-none transition-transform duration-300 ease-out visited:text-white hover:scale-110 focus-visible:scale-110 focus-visible:ring-4 focus-visible:ring-fi-ai/40 active:scale-95 motion-reduce:animate-none motion-reduce:transition-none sm:size-[88px]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 animate-fi-bubble-ring rounded-full border-2 border-solid border-fi-primary/60 motion-reduce:hidden" />
        <span aria-hidden className="pointer-events-none absolute inset-0 animate-fi-bubble-ring rounded-full border-2 border-solid border-fi-ai/60 [animation-delay:1.6s] motion-reduce:hidden" />
        <span aria-hidden className="pointer-events-none absolute -inset-1.5 animate-fi-bubble-glow rounded-full bg-linear-to-br from-fi-primary to-fi-ai blur-lg motion-reduce:animate-none motion-reduce:opacity-40" />

        <span aria-hidden className="absolute inset-0 overflow-hidden rounded-full bg-linear-to-br from-fi-primary via-[#B81F9B] to-fi-ai shadow-[0_10px_28px_-6px_rgba(109,40,217,0.55),inset_0_-6px_14px_rgba(21,19,26,0.22),inset_0_2px_3px_rgba(255,255,255,0.45)]">
          <span className="absolute -inset-1/4 animate-fi-bubble-spin bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.4)_60deg,transparent_130deg,transparent_360deg)] motion-reduce:hidden" />
          <span className="absolute inset-y-0 left-0 w-1/3 animate-fi-shine bg-linear-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" />
          <span className="absolute left-[16%] top-[10%] h-[26%] w-[44%] -rotate-[24deg] rounded-full bg-linear-to-b from-white/55 to-white/0 blur-[2px]" />
        </span>

        <span className="relative flex flex-col items-center leading-none">
          <Crown aria-hidden className="size-[22px] animate-fi-bubble-crown drop-shadow-[0_1px_2px_rgba(21,19,26,0.35)] motion-reduce:animate-none sm:size-6" />
          <span className="mt-1 text-[11px] font-bold tracking-[0.01em] drop-shadow-[0_1px_1px_rgba(21,19,26,0.35)] sm:text-[12.5px]">Get Pro</span>
          <span className="mt-0.5 text-[9.5px] font-semibold text-white/85 sm:text-[10.5px]">Plan</span>
        </span>
      </Link>

      {/* Slides out beside the bubble on hover / keyboard focus. */}
      <span aria-hidden className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-fi-ink px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-fi transition-[opacity,translate] duration-300 group-focus-within/bubble:translate-x-0 group-focus-within/bubble:opacity-100 group-hover/bubble:translate-x-0 group-hover/bubble:opacity-100 motion-reduce:transition-none">
        Lifetime Access
      </span>
    </div>
  );
}
