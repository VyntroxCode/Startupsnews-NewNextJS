'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

/** The Profile promo card's rotating content — each entry is a full slide (title + body), not
 * just a changing sentence, so the carousel dots represent real distinct slides rather than
 * decoration. All three are about the Profile section specifically, per the sidebar mapping. */
const PROFILE_SLIDES = [
  {
    title: 'Your Profile',
    body: 'Complete your profile so we can personalise what you see across the dashboard.',
  },
  {
    title: 'Track Your Progress',
    body: 'See your profile completeness at a glance and pick up right where you left off.',
  },
  {
    title: 'Unlock Recommendations',
    body: 'A complete profile helps us tailor reports and newsletters just for you.',
  },
];

const PROFILE_SLIDE_INTERVAL_MS = 4200;

/** Profile — gradient promo card, auto-rotates through `PROFILE_SLIDES`, each change sliding the
 * new title+body in from the right. The icon+text block is a real `Link` to /dashboard/settings;
 * the dots sit outside it so clicking them changes slide without also navigating (a button can't
 * nest inside an anchor). `fromRight`/`delayMs` are configurable — the card itself enters from
 * the right only when it's sitting in the row's right-hand slot, and from the bottom (like every
 * other card) when it's on the left, so the entrance direction always matches its position
 * rather than being tied to this being "the Profile card" specifically. */
function ProfileCard({ fromRight = true, delayMs = 150 }: { fromRight?: boolean; delayMs?: number }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % PROFILE_SLIDES.length);
    }, PROFILE_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const current = PROFILE_SLIDES[slide];

  return (
    <div
      className={`dash-card${fromRight ? ' dash-card-right' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)',
        border: '1px solid #e0e7ff', borderRadius: 16,
        padding: '1.75rem 2rem',
        animationDelay: `${delayMs}ms`,
        overflow: 'hidden',
      }}
    >
      <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
          }}
        >
          {/* Same gear icon as the sidebar's Profile item, so this card visibly maps to it. */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* `key={slide}` forces a fresh mount on every slide change, which is what re-triggers
              the CSS entrance animation below each time — React won't replay an animation on an
              element it merely updates in place. */}
          <div key={slide} className="dash-why-slide">
            <h2 style={{ margin: '0 0 6px', fontSize: '1.0625rem', fontWeight: 700, color: '#312e81', fontFamily: SITE_FONT_FAMILY }}>
              {current.title}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6, minHeight: '2.8em' }}>
              {current.body}
            </p>
          </div>
        </div>
      </Link>
      <div style={{ display: 'flex', gap: 6, marginTop: 18, marginLeft: 60 }}>
        {PROFILE_SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setSlide(i)}
            aria-label={`Show slide ${i + 1}: ${s.title}`}
            aria-current={i === slide}
            style={{
              width: i === slide ? 20 : 10, height: 10, borderRadius: 999, padding: 0, cursor: 'pointer',
              border: i === slide ? '2px solid #4f46e5' : 'none',
              background: i === slide ? '#fff' : '#c7d2fe',
              transition: 'width 0.25s ease, background-color 0.25s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#fff', boxSizing: 'border-box', fontFamily: SITE_FONT_FAMILY }}>
      <style>{`
        /* "Bubbling in from behind the screen" — each card starts small, blurred, and offset
           (as if it's further back and out of focus), then grows past full size before
           settling, thanks to a "back-out" easing curve (cubic-bezier(0.34, 1.56, 0.64, 1))
           that deliberately overshoots its target rather than a plain ease-out. That overshoot
           is what reads as a soft bubble pop instead of a flat slide. */
        @keyframes dashCardIn {
          from { opacity: 0; transform: translateY(60px) scale(0.72); filter: blur(6px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes dashCardInRight {
          from { opacity: 0; transform: translateX(60px) scale(0.72); filter: blur(6px); }
          to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        @keyframes dashWhySlideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        .dash-card {
          animation: dashCardIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .dash-card:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08); }
        /* Overrides just the animation-name from .dash-card above (same specificity, later in
           source order wins) so this one card enters from the right instead of fading up. */
        .dash-card-right { animation-name: dashCardInRight; }
        .dash-why-slide { animation: dashWhySlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .dash-interests-btn { border: 1.5px solid #1e293b; color: #1e293b; background: transparent; transition: background-color 0.2s ease, color 0.2s ease; }
        .dash-interests-btn:hover { background: #1e293b; color: #fff; }
        .dash-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        .dash-row:last-child { margin-bottom: 0; }
        .dash-pill-btn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 10px 20px; border-radius: 10px; background: #1e1b4b; color: #fff; font-size: 0.875rem; font-weight: 700; white-space: nowrap; transition: background-color 0.2s ease; }
        .dash-pill-btn:hover { background: #312e81; }
        .dash-manage-link { font-size: 0.875rem; font-weight: 700; color: #f97316; transition: color 0.2s ease; }
        .dash-manage-link:hover { color: #c2410c; }
        @media (max-width: 720px) {
          .dash-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .dash-interests-row { flex-direction: column; align-items: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-card, .dash-why-slide { animation: none; }
          .dash-card:hover { transform: none; }
        }
      `}</style>

      <div className="dash-row">
        {/* Profile — gradient promo card, now the first/left card in this row, so it enters
            from the bottom like every other left-hand card (see ProfileCard above) and animates
            in first (delayMs=0). Links to the sidebar's Profile page. */}
        <ProfileCard fromRight={false} delayMs={0} />

        {/* Newsletter — plain white card + outlined CTA, same shape as the reference's
            "Add your Family" personalization prompt. Now the second/right card in this row, so
            it enters from the right and animates in second (150ms). Links to the sidebar's
            Newsletter page. */}
        <Link
          href="/dashboard/newsletter"
          className="dash-card dash-card-right dash-interests-row"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'nowrap',
            textDecoration: 'none', color: 'inherit',
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
            padding: '1.75rem 2rem', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            animationDelay: '150ms',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', fontFamily: SITE_FONT_FAMILY }}>
              Newsletter
            </h2>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.6 }}>
              Set your interests and we&apos;ll curate your Morning Signal briefing — reports and
              stories picked just for you.
            </p>
          </div>
          <span
            className="dash-interests-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              padding: '11px 22px', borderRadius: 10,
              fontSize: '0.9375rem', fontWeight: 700,
            }}
          >
            + Add Interests
          </span>
        </Link>
      </div>

      <div className="dash-row">
        {/* Brand Stories — mirrors the reference's "Fixed Deposits" card: title + solid pill
            button in the header, description, then an illustration beside an info line. Links
            to the sidebar's Brand Stories page. */}
        <Link
          href="/dashboard/brand-stories"
          className="dash-card"
          style={{
            display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit',
            background: '#fff',
            border: '1px solid #fed7aa', borderRadius: 16,
            padding: '2rem', minHeight: 380, animationDelay: '300ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', fontFamily: SITE_FONT_FAMILY }}>
              Brand Stories
            </h2>
            <span className="dash-pill-btn">Read Stories</span>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '0.9375rem', color: '#78716c', lineHeight: 1.6, maxWidth: '46ch' }}>
            In-depth features and founder stories from across the startup ecosystem.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ width: 240, height: 240, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF; next/image would need unoptimized and gains nothing for a local file this small */}
              <img src="/images/gif/press-release-hero.gif" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <p style={{ margin: 0, flex: 1, minWidth: 160, fontSize: '0.8125rem', color: '#78716c', lineHeight: 1.6 }}>
              Every story is written and edited by our team — real founders, real journeys, no
              filler.
            </p>
          </div>
        </Link>

        {/* Reports — mirrors the reference's "Goals" card: header link, a large centered
            illustration, and a bold headline. Links to the sidebar's Reports page. */}
        <Link
          href="/dashboard/reports"
          className="dash-card"
          style={{
            display: 'flex', flexDirection: 'column', textAlign: 'center', textDecoration: 'none', color: 'inherit',
            background: '#fff', border: '1px solid #fed7aa', borderRadius: 16,
            padding: '1.75rem 2rem', minHeight: 380, animationDelay: '450ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Same document icon as the sidebar's Reports item, so this card visibly maps to it. */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', fontFamily: SITE_FONT_FAMILY }}>
                Reports
              </h2>
            </div>
            <span className="dash-manage-link">+ View Reports</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 220, height: 220, borderRadius: 24, background: '#ffe4c4', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF, see note above */}
              <img src="/images/gif/Financial charts and statistics on tab with up arrow.gif" alt="" aria-hidden="true" style={{ width: 190, height: 190, objectFit: 'contain' }} />
            </div>

            <p style={{ margin: '0 0 6px', fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>Data-backed reports, weekly.</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#a8a29e', lineHeight: 1.5 }}>
              Curated startup, funding, and sector reports — updated every week with verified
              data.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
