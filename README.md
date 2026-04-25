# Zox News – Next.js Theme

This is a Next.js port of the **Zox News** WordPress theme (v3.17.1). It keeps the same layout, styling, and behavior as the original theme, including responsive and mobile behavior.

## What’s included

- **Layout**: Same structure as the theme – header (top bar + nav), fly-out menu, search overlay, footer.
- **Styles**: Original `style.css` and `media-queries.css` from the theme for desktop and mobile.
- **Home**: Featured hero + 4 cards, then “More News” list with sidebar area.
- **News**: Full blog listing at `/news`.
- **Single post**: Article page at `/post/[slug]` with featured image and content.
- **Search**: Search overlay (icon in header) and results at `/search?q=...`.
- **Interactions**: Fly-out menu (hamburger), search toggle, back-to-top button.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Project structure

- `src/app/` – App Router pages (home, news, post, search).
- `src/app/styles/` – Theme CSS (`style.css`, `media-queries.css`).
- `src/components/` – Header, Footer, FlyMenu, SearchOverlay, ThemeScript.
- `src/lib/` – Site config and mock post data.
- `public/images/logos/` – Theme logo images.

## Data

Posts and config are in `src/lib/data.ts` and `src/lib/config.ts`. Replace with your CMS or API when you connect a backend.

## Responsive / mobile

The theme’s media queries are included, so:

- **Desktop**: Full header with logo, social, menu, search.
- **Mobile**: Compact nav, hamburger opens the fly-out menu (same as the original theme).

Breakpoints and layout follow the original Zox News theme.
# Startupnews
# Startupnews-NextJS
