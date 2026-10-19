# Prompt — Split `zox-nextjs` into 4 connected repositories

> Paste everything below the line into a coding agent (Claude Code or similar) started in
> `/root/Startupsnews-NewNextJS`. It is written for that agent, not for a human reader.

---

## Your task

You are splitting the StartupNews.fyi monolith (`zox-nextjs` — Next.js 16.1.6 App Router, React 19,
TypeScript, MariaDB, Redis, S3) into **four separate git repositories**, and preparing the move of
its database to Amazon RDS:

1. **Admin panel** — Next.js
2. **User dashboard** — Next.js
3. **Main website** — Next.js
4. **Backend** — Node.js (all APIs, database access, background jobs)

They are connected over HTTP. **Nothing a reader, staff member or employee sees or does may change** —
same URLs, same screens, same logins, same data. This is a move, not a rewrite: copy code across and
change only what the split forces you to change.

Before writing anything, read in full: `CLAUDE.md`, `agent.md`, and `arch.md` — especially §2 runtime
topology, §3 layering, §4 module registry, §5 route surface, §7.1 auth, §7.2 caching, §7.3 background
work, §7.5 styling, §8 deployment and §9 invariants. They describe how the system works today and
win over anything you assume.

## Target shape

| Repo | Stack | Owns | Dev port | pm2 name(s) |
|---|---|---|---|---|
| `snfyi-backend` | Node.js 20, TypeScript, **Express 5**; `tsx` in dev, `tsc` build | All 246 `src/app/api/**/route.ts` handlers, all of `src/modules/*` (domain / repository / service / utils), `src/shared/*`, `src/queue`, `src/workers`, `cron/`, `scripts/` (migrations, seeds, backfills, exports), every server-only `src/lib/*` file (mailers, `smtp.ts`, `cloudflare-d1.ts`, `cloudflare-purge.ts`, `sitemaps.ts` queries, `site-settings.ts`, `data.ts`, `rate-limit/`, `request-fingerprint.ts`, …), S3, Azure OpenAI | 4000 | `snfyi-backend`, `snfyi-backend-cron` |
| `snfyi-web` | Next.js 16.1.6 | Main website: `/`, `/[...slug]`, `/news`, `/category/*`, `/author/*`, `/search`, `/events/*`, `/startup-events/*`, `/expand-north-star`, `/incubatx/*`, every marketing / policy / lead-form page, `/login`, `/unsubscribe`, the 7 non-API route handlers (sitemaps + `llms.txt`), `manifest.ts`, icons, `public/` (incl. `sw.js`, `robots.txt`, `offline.html`), `proxy.ts`, light/dark theme | 3011 | `snfyi-web` |
| `snfyi-dashboard` | Next.js 16.1.6, `basePath: '/dashboard'` | User dashboard: everything under `/dashboard/*` (home, funding + deals / market / search / ai, reports, brand-stories, newsletter, settings, pro) | 3012 | `snfyi-dashboard` |
| `snfyi-admin` | Next.js 16.1.6, `assetPrefix: '/_admin'` | Admin panel `/admin/*` **and** the employee portal `/employee/*`. They stay together because `/employee/(content)/*` re-exports the admin pages, both use `staff-panel-tailwind.css`, and the content bridge (`getContentEmployeeSession`, `panelPath`) only works with both in one app | 3013 | `snfyi-admin` |

**Where the repos live.** Create them side by side in `/root/snfyi/` (`/root/snfyi/snfyi-backend`, …),
each with its own `git init`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`,
`.env.example` and `README.md`. Proposed remotes (do not create or push to them — I will):
`https://github.com/VyntroxCode/snfyi-backend.git`, `…/snfyi-web.git`, `…/snfyi-dashboard.git`,
`…/snfyi-admin.git`. Leave `/root/Startupsnews-NewNextJS` untouched except for its docs (see the
documentation section below): it keeps running as the live site until I cut over.

**Ports.** Do not use 3000 (an unrelated MorningPulse app runs there under pm2) or 3010 (the current
`startupgpt-dev` app). Never stop, restart or edit a pm2 app you did not start.

**No shared package.** Each repo stands alone — no shared npm package, git submodule, symlink or
cross-repo import. Code that runs in both the browser and the server today (domain types and
constants, `shared/middleware/roles.ts` role lists, and pure utils such as
`funding-deals/utils/columns.ts`, `sales-tracker/utils/import-columns.ts`,
`advertise-submissions/domain/budget.ts`, the `funding-sponsor-cards` validators,
`lead-assignments/domain/types.ts`) is **copied** into each frontend that imports it, under
`src/lib/from-backend/<original path>`. Copy only what that frontend uses. The backend copy is the
source of truth, and the backend must keep validating everything the browser validates.

**Keep the `@/` import alias** in every repo (`tsconfig` `paths`) and keep folder names, so most moved
files need no import edits. Rewrite only imports whose target now lives in another repo.

## How the four connect

### One domain, routed by path

All four apps sit behind the existing nginx on the **same domain** (`startupnews.fyi` in production,
`dev.startupgpt.fyi` on this box). nginx sends each request to one app by path:

| Path | Goes to |
|---|---|
| `/api/*` | `snfyi-backend` :4000 |
| `/admin`, `/admin/*`, `/employee`, `/employee/*`, `/_admin/*` (assets; nginx strips the `/_admin` prefix) | `snfyi-admin` :3013 |
| `/dashboard`, `/dashboard/*` (incl. its `/dashboard/_next/*` assets, from `basePath`) | `snfyi-dashboard` :3012 |
| everything else | `snfyi-web` :3011 |

Why one domain rather than subdomains: reader, staff and employee tokens live in `localStorage`
(`pub_auth_token` and the admin/employee keys, §7.1), which is per origin. On one origin every login
keeps working with **no auth change**, no CORS, no cookie work, the Google / LinkedIn OAuth redirect
URIs (`/api/public-auth/linkedin/callback`) and Turnstile domains stay valid, and no reader-visible
URL changes.

Consequences you must handle:
- **Browser code keeps its relative `fetch('/api/...')` calls** — do not rewrite the ~140 client fetches.
- **Server-side code** (server components, ISR pages, sitemap/`llms.txt` handlers, `proxy.ts`) cannot
  use a relative URL. It calls `API_INTERNAL_URL` (`http://127.0.0.1:4000`) through one
  `src/lib/api-server.ts` per frontend. Do not scatter base URLs through components.
- **Development without nginx**: each frontend's `next.config.ts` adds a rewrite `/api/:path*` →
  `${API_INTERNAL_URL}/api/:path*`, enabled only when `API_PROXY_IN_DEV=1`. Production uses nginx.
- **Links that cross apps must be plain `<a href>` or `window.location`**, never `next/link` or
  `router.push` — a soft navigation into another Next app breaks. Known crossings: `Header.tsx`
  (`/dashboard`, `/dashboard/reports`), `FlyMenu.tsx`, `AuthModal.tsx`, `components/auth/*`, the
  dashboard's links back to articles / home / `/login`, and any admin "View on site" button. Grep for
  every `href`, `push(` and `replace(` that targets a path owned by another app.
- **Admin static files**: `snfyi-admin` serves its assets under `/_admin`. Anything it loads from
  `public/` must go under `public/_admin/…` or come from S3, so it never collides with the website's
  `public/`. Verify `next/image` works in the admin app with `assetPrefix`; where it does not, use
  `unoptimized` for that image and note it.
- **Service worker**: `public/sw.js` is registered by the website at scope `/`, so it also sees
  `/admin`, `/employee`, `/dashboard` and `/api` requests. Read it and make sure it never caches or
  serves another app's pages or assets (pass those paths straight to the network).

### Server-to-server calls

Server-side frontend calls go to `API_INTERNAL_URL` with an `X-Internal-Key` header (secret in env).
Public endpoints stay public; the key only unlocks the internal endpoints you add (e.g. sitemap feeds
or bulk reads that exist only to replace a direct DB call).

**Forward what the backend needs.** When a server component calls the backend on behalf of a browser
request, pass on the headers the old in-process code read: client IP (`X-Forwarded-For`, used by rate
limits and `request-fingerprint.ts`), `X-Forwarded-Proto`, `User-Agent`, and the auth header or cookie
where the page was personalised.

### Cache refresh (backend → website)

Today admin routes call `revalidatePath` / `revalidateTag` in the same process: `api/admin/posts/[id]`,
`api/admin/inner-pages/[pageKey]`, `api/admin/partner-logos` (+ `[id]`),
`api/admin/site-settings/footer-copyright`, `api/admin/site-settings/feature-startup-images`,
`lib/revalidate-events.ts`, `modules/posts/repository/posts.repository.ts`. After the split the
backend cannot do that. Add a route on `snfyi-web` at `/_internal/revalidate` that takes
`{ paths?: string[], tags?: string[] }` and checks an HMAC of the body with `REVALIDATE_SECRET`. The
backend calls it on `http://127.0.0.1:3011` (never through the public domain; nginx returns 404 for
`/_internal/*`) wherever it called `revalidate*` before — same paths and tags. Make it fire-and-forget
with a short timeout, so a website that is down never fails an admin save. Same for `snfyi-dashboard`
if any of its pages use ISR. `lib/cloudflare-purge.ts` stays on the backend.

## Database — AWS RDS for production and dev

The database moves from the MariaDB container on this box to **Amazon RDS**, with two instances on
the **same engine** so dev tests exactly the SQL that prod runs:

| | Production | Dev |
|---|---|---|
| Engine | RDS for **MariaDB 10.11** (same as today's `zox-mariadb`; the old prod host runs 10.6) | RDS for MariaDB 10.11 |
| Database | `zox_db` | `zox_db` (separate instance — never point dev at prod) |
| Size | Pick from current load; `max_connections` must cover backend + cron pools (see below) | Smallest burstable class that fits the ~160 MB data set |
| Backups | RDS automated backups + point-in-time restore on, plus the existing twice-daily dump to `s3://startupnews-media-2026/db-backups/` | Automated backups on, short retention |

**Keep the SQL exactly as it is.** The code is MariaDB SQL throughout (`ON DUPLICATE KEY UPDATE` in
23 files, transactions in 41, `FOR UPDATE` row locks in payroll / lead follow-ups / offboarding,
`NOW()`, `CURDATE()`, `INTERVAL`, `JSON_*`, generated columns). RDS for MariaDB runs it unchanged. Do
not switch engines, do not add an ORM, do not "tidy" queries.

**Cloudflare D1 is not an application database.** It stays only for what it does today: the
fire-and-forget copy of new reader sign-ups (`lib/cloudflare-d1.ts`, table `registered_users_dump`,
shared with MorningPulse). Never read app data from D1 and never point `DB_*` at it.

**Parameter group** (one per instance, created from the default MariaDB 10.11 group) must match what
the app relies on today — read the live values from the current server before writing it:
- `max_allowed_packet` = 64M (§8 — at 2 KB every `hr_rules` / Directory save failed);
- `character_set_server` / `collation_server` = the same as today's `zox_db` (check
  `SHOW VARIABLES LIKE 'character_set%'` and the tables' collation; expect `utf8mb4`);
- `sql_mode` = today's value exactly — a stricter default can start rejecting inserts that work now;
- `time_zone`: leave the server default; the app sets `timezone: '+05:30'` per connection and
  `process.env.TZ = 'Asia/Kolkata'` (§7.6). Check that `DATETIME` / `TIMESTAMP` values read back the
  same as on the monolith for a sample of rows;
- `max_connections` ≥ (backend `DB_CONNECTION_LIMIT` × backend processes) + cron pool + migration /
  backup headroom. `.env` sets `DB_CONNECTION_LIMIT=50` today; size the pool to the instance, not the
  other way round (§9 #15).

**Network and security** (this replaces "loopback only" from §9 #19 for the database):
- Prod RDS: **Publicly accessible = No**, in private subnets; its security group allows 3306 only
  from the security group of the backend host(s). Frontends have no route to it.
- Dev RDS: also not public if this box can reach it privately. If this dev box is outside AWS, the
  choice between an SSH tunnel through a bastion and a public endpoint locked to this box's IP is
  **mine** — ask me, do not open it yourself.
- **TLS on every connection.** `shared/database/connection.ts` already has `ssl: DB_SSL === 'true'`.
  Extend it to load the RDS CA bundle from `DB_SSL_CA` (path to `global-bundle.pem`) and verify the
  server certificate. This is the one code change the database needs.
- Master user is for admin only; the app uses its own user (`zox_user`) with rights on `zox_db` only.
  All passwords live in the gitignored `.env` (or AWS Secrets Manager if I set it up) — never in a
  tracked file, never a guessable literal (§8, the 2026-09-17 wipe).

**Env vars** (backend only): `DB_HOST` (RDS endpoint), `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`DB_SSL=true`, `DB_SSL_CA`, `DB_CONNECTION_LIMIT`, `DB_IDLE_TIMEOUT`, `DB_ACQUIRE_TIMEOUT`.

**Migrations** stay raw SQL in `snfyi-backend/scripts/migrations/`, applied the same way as today
(§8: retry loop, `.applied_migrations` manifest), now against the RDS endpoint over TLS. The dev
instance gets every migration first.

**Moving the data** is part of the cutover plan (step 6), written but not run: freeze writes (maintenance
page) → `mariadb-dump --single-transaction --routines --triggers` of `zox_db` → restore into RDS →
compare row counts for every table and checksums for the big ones (`posts`, `contacts`,
`hr_*`, `sales_leads`) → switch `DB_HOST` → unfreeze. Include how long the freeze will take for the
current size, and the rollback (point `DB_HOST` back; writes made on RDS after the switch are listed
for manual copy). Dev RDS is seeded the same way from a copy, so dev never shares data with prod.

**Do not create, change or delete any AWS resource** (RDS instance, parameter group, security group,
subnet, secret, IAM). Write the exact settings in the cutover plan; I create them.

## Porting the backend

**Express 5, with the handler bodies kept as they are.** The 246 Next route handlers are written
against the web `Request` / `Response` API (`await request.json()` in 65 files, `request.formData()`
in 7, `NextResponse.json(...)` everywhere). Express uses Node's own `req` / `res`. Do **not** rewrite
246 handlers into `(req, res)` style — that is where bugs come from. Instead build one adapter and
keep each `export async function GET/POST/PUT/PATCH/DELETE(request, ctx)` body unchanged:

- **`src/http/next-adapter.ts`** — `toExpress(handler)` turns an Express `req` into a web `Request`
  (full URL from `X-Forwarded-Proto` + `Host` + `req.originalUrl`, all headers, method, and for
  non-GET/HEAD the **raw request stream** as the body with `duplex: 'half'`), calls
  `handler(request, { params: Promise.resolve(req.params) })` — 55 handlers `await params`, Next 16
  style — and writes the returned `Response` back: status, every header (each `Set-Cookie`
  separately), and the body piped with `Readable.fromWeb` so streams stay streams. Errors go to one
  Express error handler that answers `500 { error }` the way the handlers do today.
- **No body parsers on these routes.** Do not mount `express.json()`, `express.urlencoded()` or
  `multer` globally — the adapter hands the untouched stream to the handler, so `request.json()`,
  `request.formData()` and the six token sources (incl. the form-field token) keep working exactly as
  now. Keep the body size limits the handlers enforce today.
- **`src/http/next-compat.ts`** — what the handlers import instead of `next/server`: `NextResponse`
  (`json`, `redirect`, `next`, `rewrite` if used, `cookies.set`), `NextRequest` (`nextUrl` with
  `searchParams` / `pathname`, `cookies.get`), and `after(fn)`, which runs `fn` once the response has
  finished (`res.on('finish')`) and swallows errors. `after()` is used for the Cloudflare D1 copy of new
  sign-ups in `public-auth/register`, `public-auth/google-verify` and `public-auth/linkedin/callback`;
  a failure there must still never fail the sign-up. Change the handlers' import line only.
- **Routing.** Generate the route table from the folder tree (a small script, not 246 hand-written
  lines): `[id]` → `:id`, `[...slug]` → `*slug` (Express 5 syntax; join the parts back into the
  array Next gives), keep every method the file exports, and answer `405` for the others as Next does.
  Register static segments before dynamic ones so `/api/admin/posts/bulk-status` never matches
  `/api/admin/posts/:id`. Set `case sensitive routing` on (Next paths are
  case-sensitive). Next answers a trailing-slash URL with a 308 to the path without it; add one small
  middleware that does the same for `/api/*`, and diff a few such requests against the monolith.
- **Per-route options.** Handlers export `maxDuration` (30 / 60 / 120 / 300 / 900 s), `dynamic` and
  `runtime`. Read `maxDuration` into a per-route timeout: Node's server default `requestTimeout` is
  300 s, so raise `server.requestTimeout` / `headersTimeout` / `keepAliveTimeout` above the largest
  value and enforce each route's own limit in the adapter; the nginx `proxy_read_timeout` for those
  paths must be at least as long. `dynamic` / `runtime` / `revalidate = 0` are no-ops in Express —
  drop them only from the backend copy.
- **Middleware order:** `trust proxy` = the number of proxies in front (nginx, plus ALB / Cloudflare in
  prod) so `req.ip` and `X-Forwarded-*` stay right for the rate limits → request logging → routes →
  error handler. No `cors()` (one origin), no `helmet()` defaults that would add or change response
  headers the monolith does not send.
- Mount routes so **every path, method, status code, header and JSON shape stays identical**.
- Remove `import 'server-only'` (7 files) on the backend — everything there is server code. Keep it
  in the frontends on any file that must never reach the browser.
- **Auth middleware moves unchanged**: `auth.middleware.ts` (all six token sources — header,
  `X-Admin-Token`, `X-Access-Token`, cookie, form field, query param; the `role` → `users` vs
  `panel_admins` lookup), `employee-auth.middleware.ts` (alumni / blocked gate, §6.11),
  `content-access.middleware.ts` (the employee bridge, §9 #35 — only on the routes listed in §7.1),
  `roles.ts`.
- **Multipart uploads** (`/api/admin/upload`, `media/ingest`, HR documents, IT-ticket attachments, KYC)
  must accept the same field names and size limits. Presigned S3 uploads (`/api/admin/presign`,
  employee and IT-ticket presign) work as before — the origin does not change, so S3 CORS stays as is.
- **Content Studio** `POST /api/admin/content-studio/generate` streams Azure OpenAI output (SSE). It
  must still stream through Express and nginx (`res.flushHeaders()`, no compression middleware on it): no response buffering (`X-Accel-Buffering: no`, and
  `proxy_buffering off` on that location), and a long enough read timeout. Keep `safeFetch` and the
  role gate (§9 #26).
- **Server action** `src/app/actions/upload-image.ts` becomes a backend endpoint; update its callers.
- **Env**: `shared/config/env-validation.ts` checks only backend vars. Keep `process.env.TZ =
  'Asia/Kolkata'` and the DB pool settings from `shared/database/connection.ts` (§7.6).
- **Cron** (`cron/index.ts` + 5 jobs, in-memory queue, Redis locks, `ENABLE_CRON` /
  `ENABLE_RSS_PROCESSING` / `ENABLE_IMAGE_DOWNLOAD` flags) becomes the backend's second process
  (`npm run cron`), same schedules. Jobs stay idempotent (§9 #7) and Redis stays optional (§9 #6).
- Add request logging (method, path, status, ms) and keep `/api/health`.

## Porting the frontends

**Direct server-code imports that must become API calls.** These files outside `src/app/api` import
modules, `shared/*`, `lib/data`, `lib/sitemaps` or `lib/site-settings` today:

- **web**: `layout.tsx`, `page.tsx`, `[...slug]/page.tsx`, `about-us`, `advertise-with-us` (page +
  `AdvertiseEnquiryForm.tsx`), `author/[slug]`, `category/[slug]`, `contact-us`, `events` (+ `[slug]`),
  `expand-north-star`, `feature-your-startup`, `list-your-event`, `news`, `our-partners`,
  `press-release`, `search`, `sponsor-event`, `startup-events/[slug]`, `submit-funding-round`,
  `submit-press-release`, and the route handlers `llms.txt`, `sitemap_index.xml`, `sitemap.xml`,
  `sitemap-news.xml`, `sitemap-events.xml`, `sitemap-static.xml`, `sitemap-posts/[page]`.
- **dashboard**: `dashboard/reports/page.tsx`, `dashboard/brand-stories/BrandStoriesPageContent.tsx`.
- **admin**: `(admin)/layout.tsx`, `(admin)/admin/page.tsx`, `posts` (+ `create`), `reports`
  (+ `create`, `edit/[id]`), `brand-stories` (+ `create`, `edit/[id]`), `content-studio`, `inner-pages`,
  `partnership-tracker`, `sales-tracker`; `employee/(content)/layout.tsx`,
  `employee/(content)/content-studio`, `EmployeeShell.tsx`, `employee/dashboard`, `employee/directory`.
- **components**: `components/admin/hr-tool/api.ts` reaches a repository/service. The other ~120
  component files import only `domain` / `utils` — copy those into `src/lib/from-backend/`.

For each, sort the import: a type, constant or pure function → copy it; anything that touches the DB,
Redis, S3, SMTP or a secret → call an existing `/api/...` endpoint, or add one to the backend. Keep
every page's `revalidate`, `dynamic` and `generateStaticParams` as they are, and keep metadata
(`generateMetadata`, `seoTitle`) producing identical output.

Also handle:
- **`proxy.ts`** (web) fetches `/api/posts/robots` and `/api/events/robots` on its own origin and
  rewrites `https://localhost` → `http://localhost`. Point both at `API_INTERNAL_URL`. Its matcher
  must keep skipping `sitemap*` (§9 #9); keep its caches as they are.
- **`ConditionalLayout`** (web): drop the `/admin`, `/dashboard`, `/employee` branches — those paths no
  longer reach this app. Keep `BARE_ROUTES`, `SamePageReload`, `DelegationStrip` on `/`. The dashboard
  renders `DelegationStrip` on `/dashboard/funding/*` itself. `lib/theme.ts` `PANEL_ROUTE` goes away
  in web; the dashboard and admin apps never set `data-theme`, so they stay light.
- **Root layout extras** (`DatePickerOnClick`, `ScrollButtons`, `TopLoader`, `ThemeScript`,
  `GoogleAnalytics`, `ServiceWorkerRegister`, `InstallPWA`, `AuthModal`): keep each one only in the
  apps where it renders today. `DatePickerOnClick` is needed in all three.
- **Styling** stays exactly as today (§7.5, §9 #5): web gets `globals.css`, `style.css`,
  `media-queries.css`, `isolated-tailwind.css` (marketing part) and `footer-tailwind.css` (`ft` prefix);
  dashboard gets `isolated-tailwind.css` (dashboard part, `--color-db-*`, fonts); admin gets
  `staff-panel-tailwind.css` + `staff-panel-palette.css` and whatever plain CSS the admin pages import
  today. Copy the shared plain CSS each app actually relies on — check the panels' look in a browser
  against the live site. Fix every `@source` path after moving files; never put two scoped Tailwind
  sheets on one page. `postcss.config.mjs` keeps `@tailwindcss/postcss` before `postcss-import`. Fonts
  stay `next/font/local` from `src/fonts/` (§9 #20) — copy the files each app uses.
- **`next.config.ts`**: each app gets only what it uses (web: the `/sitemap-posts-N.xml` rewrite,
  image domains, `qualities: [60, 90]`, headers; dashboard: `basePath`; admin: `assetPrefix`). Copy
  the `NEXT_BUILD_DIR` handling so the atomic build swap keeps working (§7.2, §8).
- **Old redirects** inside the app that point at another app (e.g. a login guard in the dashboard
  sending people to `/login`) must use full-page navigation.

## Rules that still apply in every repo

- No SQL outside `repository/`; route handlers call services (§9 #1). No inline role arrays (§9 #2).
- Redis stays optional — no code path may assume a cache hit (§9 #6).
- DECIMAL columns come back as strings — keep the `Number()` coercions (§9 #8).
- The split needs **no schema change**. Every schema change needs a file in `scripts/migrations/`
  (§9 #10) — if you think one is needed, stop and ask me.
- Redis and any other service on this box stay on `127.0.0.1` (§9 #19). The database is RDS, reachable
  only from the backend's security group, over TLS (see "Database"). No secret in a tracked file. Each repo's
  `.env.example` lists only the variables that repo reads. Frontends get **no** DB, Redis, S3, SMTP,
  JWT, Azure, Cloudflare or OAuth secrets — only `API_INTERNAL_URL`, `INTERNAL_API_KEY`,
  `REVALIDATE_SECRET` (web) and `NEXT_PUBLIC_*` values.
- Any test process runs with a small pool: `DB_CONNECTION_LIMIT=3 DB_IDLE_TIMEOUT=10000` (§9 #15).
  One dev server once used up MariaDB's connections and took the live site down. Until the dev RDS
  exists, test against today's `zox_db` on this box, read-only.
- **Copied code is kept in step by hand.** Every file in `src/lib/from-backend/` starts with
  `// Copied from snfyi-backend/<path> — keep in sync.` The backend `README.md` lists every file that
  has copies and which repos hold them. A change to one updates its copies in the same piece of work.
- **Do not build, `pm2 start/restart`, deploy, change nginx, apply migrations, commit or push unless I
  explicitly say so.** `next dev` / `tsx` for testing is fine, with the small DB pool, on the ports
  above, and stop what you start. When I do ask for a commit, stage only the files of that change —
  never `git add -A`.
- New UI (if any is unavoidable): Tailwind utilities only; admin icons from `lucide-react`, or
  `@remixicon/react` when Lucide has no match (§9 #27).
- Any image, PDF or document added along the way goes to S3, not into a repo.

## Documentation

- **This repo** (`/root/Startupsnews-NewNextJS`): follow `CLAUDE.md`. The split is a **major** change:
  log each step in `agent.md`; when the new repos are ready, update `arch.md` §1–§3, §5, §7.1, §7.2 and
  §8 for the new layout (add a mermaid diagram of nginx → four apps → MariaDB / Redis / S3) with a §10
  change-log row; add a new version block to `Product.html` in plain language (append-only — never
  edit older versions).
- **Each new repo** gets a `README.md` (what it owns, how it connects to the others, env vars, how to
  run it locally) and its own `CLAUDE.md`, `agent.md` and `arch.md`, scoped to that repo, carrying
  over the invariants from `arch.md` §9 that apply to it.

## Order of work

The live site keeps running from the monolith the whole time. Each step is checked against it.

1. **Inventory — no code yet.** Produce one table: every page, route handler, component, lib file,
   module, script and config file → target repo, with every cross-app import and every new backend
   endpoint it needs. Include the list of cross-app links and redirects. **Show me the table and wait
   for my go-ahead.**
2. **`snfyi-backend`.** Port route groups in this order: public reads (posts, categories, events,
   banners, site-settings, search, reports, brand-stories) → public forms → public-auth → dashboard →
   employee → admin. After each group, send the same requests to the backend on :4000 and the monolith
   on :3010 and diff status, headers that matter and JSON bodies (read-only requests only against the
   live DB — never test writes there without asking me). Then move cron.
3. **`snfyi-admin`** (admin + employee). Keep `isSpecialPath` / `SELF_REFRESHING_ADMIN_PAGES` (§9 #13),
   `panelPath` and the content bridge working.
4. **`snfyi-dashboard`.**
5. **`snfyi-web`** last — it carries SEO. For a sample of at least 50 URLs (home, articles of each
   legacy slug shape, categories, authors, events, a 410 post, every sitemap), compare against the
   monolith: status code, `<title>`, canonical, robots meta, `X-Robots-Tag`, JSON-LD and sitemap XML.
6. **Cutover plan — write it, do not run it.** nginx config for the routing table above (incl. SSE
   and `/_internal` rules), one `ecosystem.config.js` and one deploy script per repo (keep the atomic
   build-dir swap and "rebuild + restart in the same run" from `deploy.sh`, §8), env per app, the exact
   RDS settings for prod and dev (instance class, engine version, parameter group values, security
   groups, backups), the data move from "Database", the order to switch over, and how to roll back to
   the monolith in one step. Database move and app switch are separate steps, each with its own rollback.

## Done means

- Each app starts on its own port with only its own `.env` and works through nginx (or the dev
  rewrite) against the backend.
- No frontend has `mariadb`, `redis`, `@aws-sdk/*`, `nodemailer`, `bcryptjs` or `jsonwebtoken` in its
  `package.json`, or imports a repository, service or `shared/database`.
- Every URL from the old route surface (§5) is served by exactly one app and matches the monolith.
- Reader, staff and employee logins all work, and a reader signed in on the website is signed in on
  `/dashboard`. Content Studio streams. Uploads work. Each cron job runs once.
- Saving a post, inner page, partner logo, site setting or event in admin refreshes the matching
  public page as it does today.
- The backend connects to MariaDB over TLS with certificate checks when `DB_SSL=true` + `DB_SSL_CA`
  are set, and works unchanged against a plain local MariaDB when they are not.
- A final report: what moved where; each item in "Porting the frontends" and "Porting the backend"
  and how it was handled; what was compared and the results; anything not verified; open decisions.

**Ask me before:** adding a dependency not already in `package.json` (`express@5` and
`@types/express` are approved), changing any URL, any auth or token handling, anything that needs a DB change, any AWS
resource, or any step that would touch the live site or the live database.
