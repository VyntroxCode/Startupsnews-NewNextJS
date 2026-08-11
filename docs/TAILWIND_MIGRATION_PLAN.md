# Migrate zox-nextjs from legacy global CSS to Tailwind

## Context

The site is a Next.js port of the "Zox News" WordPress theme. Styling today comes entirely from three global stylesheets pulled in via `src/app/globals.css`:

- `src/app/styles/style.css` — 7,878 lines, the original WP theme stylesheet (universal `* {margin:0}` reset, float-based layout, `.mvp-*` / `.startupnews-*` class names)
- `src/app/styles/media-queries.css` — 6,874 lines, custom breakpoints (1601px, 1260–1200px, 1199–1100px, and more down to mobile)
- `src/app/globals.css` — 8,464 lines of theme overrides/additions

That's ~23,000 lines of non-scoped global CSS. There are no CSS Modules anywhere in `src/`. Components reference legacy class names directly (180+ distinct `.mvp-*` class names, 389 `className` usages in `src/components/*.tsx` alone), plus 88 files with inline `style={{...}}` for values the CSS didn't cover. `tailwindcss@^4` and `@tailwindcss/postcss@^4` are already in `package.json` as dependencies but are explicitly turned off — `postcss.config.mjs` only runs `postcss-import` today, with a comment: "No Tailwind - this project uses only globals.css."

Goal: get the codebase "Tailwind-ready" and migrated off the legacy stylesheet, without a risky big-bang rewrite of a live production news site. There's no visual-regression tooling or test suite in the repo (`package.json` has no test script), so the plan leans on incremental, independently-reviewable steps with manual verification at each stage rather than one large cutover.

## Approach: strangler-fig migration, not a rewrite

Run Tailwind alongside the legacy CSS for the duration of the migration, convert one component/page at a time, delete the legacy rules for each class name as soon as nothing references it anymore, and only delete the legacy stylesheets once they're empty. This keeps every step small, reversible, and shippable on its own.

## Phase 0 — Turn Tailwind on without changing how anything looks

1. Update `postcss.config.mjs` to run `@tailwindcss/postcss` in addition to `postcss-import`.
2. In `src/app/globals.css`, add Tailwind v4's import **without its preflight reset** (the legacy stylesheet already has its own universal reset at the top of `style.css`; running both resets fights each other). Use the layered import form so only Tailwind's `theme` and `utilities` layers load:
   ```css
   @import "tailwindcss/theme.css" layer(theme);
   @import "tailwindcss/utilities.css" layer(utilities);
   ```
3. Declare an explicit `@layer` order so Tailwind utilities always beat legacy selectors during the transition (legacy CSS has broad selectors and some `!important`s that would otherwise win by source order):
   ```css
   @layer legacy, theme, utilities;
   ```
   and wrap the existing `@import "./styles/style.css";` / `@import "./styles/media-queries.css";` in `@layer legacy { ... }` (or import them with `layer(legacy)`).
4. Verify with `npm run build` and `npm run dev` that no page changes visually — at this point nothing uses a Tailwind utility class yet, so this step should be a no-op diff.

## Phase 1 — Port real design tokens into Tailwind's `@theme`

Pull the theme's actual values (font family `"Garnett"`, brand colors, spacing, and the custom breakpoints found in `media-queries.css`: `1601px`, `1260/1200px`, `1199/1100px`, plus the smaller ones further down the file) into a `@theme { ... }` block in `globals.css`. This makes `bg-*`, `text-*`, `screen-*` utilities match the existing look immediately, so converted components don't drift from the current design.

## Phase 2 — Pilot on 1–2 components already in flux

Git status shows several components mid-edit right now (`BannerCarousel`, `BannerCarouselClient`, `HomeDarkSection`, `HomeFeat1Section`, `HomeWidgetSection`, `MobileCategorySection`, `MoreNewsSection`, `PostImage`, `FlyMenu`, `AuthModal`, new `icons.tsx`). Pick one small, self-contained one (e.g. `MoreNewsSection` or `HomeDarkSection`) as the pilot:

- Replace its legacy `.mvp-*` class names with Tailwind utilities. This is not a mechanical find/replace — the legacy layout is float-based (`className="... left relative"` everywhere), so rebuild the layout with flex/grid as part of the port.
- Replace inline `style={{...}}` with Tailwind utilities where the value is static; keep inline styles only for genuinely dynamic values (e.g. computed image dimensions), using Tailwind arbitrary values (`h-[443px]`) where that's cleaner.
- Grep for every legacy class name the component used (e.g. `grep -rn "mvp-widget-dark" src`) to confirm no other file still depends on it, then delete those now-dead rules from `style.css`/`media-queries.css`.
- Verify visually in the dev server at each legacy breakpoint (mobile, ~1100, ~1199, ~1260, 1601+) before/after.

Use this pilot to settle conventions (naming, how repeated utility clusters get extracted into a component vs. `@apply`) before scaling out.

## Phase 3 — Systematic rollout

Work outward from the pilot, in small independently-reviewable PRs (one component or page per PR — not a single giant migration PR, given there's no automated visual regression check):

1. Shared chrome: `Header`, `Footer`, `FlyMenu`, `ConditionalLayout`
2. Homepage sections (the `Home*Section` components)
3. Category/listing pages (`src/app/[category]`, `src/app/category`)
4. Article/post detail (`FullArticle`, `src/app/[slug]`)
5. Remaining static pages (about, contact, policies, advertise-with-us, etc. — already showing in `git status` as modified)

For each: grep its legacy class names, port to Tailwind, delete the corresponding dead CSS, verify in-browser at each breakpoint, ship. Track progress simply by re-running `grep -rohE '\bmvp-[a-z0-9-]+' src --include="*.tsx" | sort -u | wc -l` and watching the count shrink toward zero.

## Phase 4 — Retire the legacy stylesheets

Once the class-name grep returns nothing:

- Delete `src/app/styles/style.css` and `src/app/styles/media-queries.css`.
- Remove their `@import`s and the `@layer legacy` scaffolding from `globals.css`.
- Drop `postcss-import` from `postcss.config.mjs` if nothing else needs it.
- `globals.css` ends up as just the Tailwind import, the `@theme` tokens, and the handful of true global rules that were already at the top of the file (html/body scroll behavior, `.post-card-excerpt-max-3-lines` line-clamp utility, etc. — re-express what still applies as Tailwind utilities/tokens where possible).

## Risks to call out

- **CSS layer ordering is what keeps this safe.** As long as legacy rules stay in the `legacy` layer and Tailwind utilities stay in `utilities`, utilities win regardless of source order or specificity — don't skip Phase 0 step 3.
- **This is float→flex/grid layout surgery, not a class rename.** Expect each component conversion to take real review time, not just search/replace.
- **No visual regression tooling exists.** Verification is manual dev-server checks at the legacy breakpoints per component. If the team wants more confidence at scale, consider adding Playwright screenshot diffing later — out of scope for this plan unless requested.

## Verification (per phase/PR)

1. `npm run build` and `npm run dev` — confirm no build/type errors.
2. Manually view the affected page(s) in-browser at breakpoints: mobile, ~1100px, ~1199px, ~1260px, 1601px+, and default desktop.
3. `grep` for the migrated class names across `src/` to confirm they're fully removed before deleting their CSS rules.
4. `npm run lint`.
