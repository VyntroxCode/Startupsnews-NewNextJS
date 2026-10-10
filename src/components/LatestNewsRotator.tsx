"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PostImage } from "@/components/PostImage";
import { useReducedMotion } from "./feature-startup/hooks";

/** How long a story stays before the next one replaces it. */
const ROTATE_MS = 5000;
const SLIDE_S = 1.2;
const EASE = [0.22, 1, 0.36, 1] as const;

/** One story as the hero card needs it — built on the server so the full `Post` (and its helpers)
 * never has to cross into the client bundle. */
export interface LatestNewsSlide {
  id: string;
  href: string;
  title: string;
  category: string;
  timeAgo: string;
  image: string;
}

/* One clock for every card on the page, not one interval per card: the three hero cards must
   change at the same instant, and a card that was paused under the mouse has to fall back into
   step with the other two rather than keep its own offset rhythm. */
const tickListeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | undefined;

function subscribeTick(listener: () => void) {
  tickListeners.add(listener);
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      // A background tab would otherwise burn through the stories unseen.
      if (document.hidden) return;
      tickListeners.forEach((l) => l());
    }, ROTATE_MS);
  }
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0) {
      clearInterval(tickTimer);
      tickTimer = undefined;
    }
  };
}

const neverChanges = () => () => {};

const slideVariants = {
  enter: (dir: number) => ({ x: `${dir * 100}%` }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: `${dir * -100}%` }),
};

function MainCard({ post }: { post: LatestNewsSlide }) {
  return (
    <Link href={post.href} rel="bookmark">
      <div className="mvp-feat1-feat-wrap left relative">
        <div className="mvp-feat1-feat-img left relative" style={{ position: "relative" }}>
          <PostImage
            src={post.image}
            alt={post.title}
            fill
            className="mvp-reg-img"
            sizes="(max-width: 768px) 100vw, 560px"
            style={{ objectFit: "cover" }}
          />
          <PostImage
            src={post.image}
            alt={post.title}
            className="mvp-mob-img"
            width={330}
            height={200}
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
        </div>
        <div className="mvp-feat1-feat-text left relative">
          <div className="mvp-cat-date-wrap left relative">
            <span className="mvp-cd-cat left relative">{post.category}</span>
            <span className="mvp-cd-date left relative">{post.timeAgo}</span>
          </div>
          <h2 className="mvp-stand-title post-heading-max-3-lines">{post.title}</h2>
        </div>
      </div>
    </Link>
  );
}

function SubCard({ post }: { post: LatestNewsSlide }) {
  return (
    <Link href={post.href} rel="bookmark">
      <div className="mvp-feat1-sub-cont left relative">
        <div className="mvp-feat1-sub-img left relative">
          <PostImage
            src={post.image}
            alt={post.title}
            width={590}
            height={354}
            className="mvp-reg-img"
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
          <PostImage
            src={post.image}
            alt={post.title}
            className="mvp-mob-img"
            width={330}
            height={200}
            style={{ width: "100%", height: "auto", objectFit: "cover" }}
          />
        </div>
        <div className="mvp-feat1-sub-text">
          <div className="mvp-cat-date-wrap left relative">
            <span className="mvp-cd-cat left relative">{post.category}</span>
            <span className="mvp-cd-date left relative">{post.timeAgo}</span>
          </div>
          <h2 className="post-heading-max-3-lines">{post.title}</h2>
        </div>
      </div>
    </Link>
  );
}

const FULL_WIDTH: React.CSSProperties = { float: "left", width: "100%", position: "relative" };

/** One Latest News hero card that swaps to the next story from the same category every five
 * seconds, the new story pushing the old one out sideways.
 *
 * `posts[0]` is the story the card shows on first paint (and the only one in the server HTML);
 * the rest are the same-category queue it loops through. `enterFrom` is the side the incoming
 * story arrives from — the page alternates it down the column (right, left, right).
 *
 * The card holds still while the mouse is over it or keyboard focus is inside it, and picks the
 * shared clock back up afterwards. It does not rotate at all with fewer than two stories or under
 * reduced motion. */
export function LatestNewsRotator({
  variant,
  enterFrom,
  posts,
}: {
  variant: "main" | "sub";
  enterFrom: "left" | "right";
  posts: LatestNewsSlide[];
}) {
  const [index, setIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const reduced = useReducedMotion();
  const hydrated = useSyncExternalStore(neverChanges, () => true, () => false);
  const count = posts.length;
  const rotates = count > 1 && !reduced;

  useEffect(() => {
    if (!rotates) return;
    return subscribeTick(() => {
      if (hovered.current || focused.current) return;
      // Not rendered at this breakpoint (the desktop hero is display: none on phones).
      if (!boxRef.current || boxRef.current.offsetParent === null) return;
      setIndex((i) => (i + 1) % count);
    });
  }, [rotates, count]);

  const Card = variant === "main" ? MainCard : SubCard;
  const dir = enterFrom === "right" ? 1 : -1;
  const post = posts[index];
  const upNext = posts[(index + 1) % count];

  return (
    <div
      ref={boxRef}
      style={{ ...FULL_WIDTH, overflow: "hidden" }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hovered.current = true;
      }}
      onPointerLeave={() => {
        hovered.current = false;
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
      }}
    >
      {/* The next story, laid out invisibly under the current one so its image is already
          downloaded when it slides in — otherwise each change would arrive as a black box that
          fills in late. Client-only, so the server HTML carries each card's first story once. */}
      {rotates && hydrated && (
        <div
          key={upNext.id}
          inert
          aria-hidden
          style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}
        >
          <Card post={upNext} />
        </div>
      )}
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={post.id}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: SLIDE_S, ease: EASE }}
          style={FULL_WIDTH}
        >
          <Card post={post} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
