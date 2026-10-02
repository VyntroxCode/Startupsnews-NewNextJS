# Self-hosted fonts

Loaded with `next/font/local`. Do not switch these back to `next/font/google`.

When the build fetches several Google fonts at once, Google sometimes returns
font URLs without a file extension (`fonts.gstatic.com/l/font?kit=...`).
Next.js 16.1.6's Google loader then crashes with
`TypeError: Cannot read properties of null (reading '1')` and the build fails
(first seen 2026-09-24, on Montserrat). Local files remove that network step.

Each file is the Latin-subset variable woff2 from Google Fonts (OFL licence),
so one file covers every weight in its range.

| File | Family | Weights | Used by |
|---|---|---|---|
| cairo-latin-var.woff2 | Cairo | 200–1000 | `src/app/expand-north-star/page.tsx` |
| montserrat-latin-var.woff2 | Montserrat | 100–900 | `src/app/expand-north-star/page.tsx` |
| schibsted-grotesk-latin-var.woff2 | Schibsted Grotesk | 400–900 | `src/app/dashboard/layout.tsx` |
| space-grotesk-latin-var.woff2 | Space Grotesk | 300–700 | `src/app/(admin)/admin/partnership-tracker/page.tsx` |
| inter-latin-var.woff2 | Inter | 100–900 | `src/app/(admin)/admin/partnership-tracker/page.tsx` |
| jetbrains-mono-latin-var.woff2 | JetBrains Mono | 100–800 | `src/app/(admin)/admin/partnership-tracker/page.tsx` |
| fraunces-latin-var.woff2 | Fraunces (roman; opsz, SOFT, WONK axes) | 100–900 | `src/modules/content-studio/components/shell/fonts.ts` |
| fraunces-italic-latin-var.woff2 | Fraunces (italic; opsz, SOFT, WONK axes) | 100–900 | `src/modules/content-studio/components/shell/fonts.ts` |
| plus-jakarta-sans-latin-var.woff2 | Plus Jakarta Sans | 200–800 | `src/modules/content-studio/components/shell/fonts.ts` |

To add a font: download the Latin variable woff2 from
`https://fonts.googleapis.com/css2?family=<Name>:wght@<min>..<max>` (Chrome
user agent), save it here, and load it with `localFont({ src, weight: '<min> <max>' })`.
