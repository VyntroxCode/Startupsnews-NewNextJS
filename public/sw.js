// StartupNews.fyi service worker — conservative caching, never touches authenticated routes.
const CACHE_VERSION = "v1";
const STATIC_CACHE = `sn-static-${CACHE_VERSION}`;
const PAGES_CACHE = `sn-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `sn-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const CURRENT_CACHES = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE];

// Never cache or serve from cache — these carry authenticated / dynamic data.
const EXCLUDED_PREFIXES = ["/api/", "/admin", "/dashboard", "/employee"];

function isExcluded(pathname) {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isHashedBuildAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isRevalidatingAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/logo.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png"
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || (event.data && event.data.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});

// Network-first for navigations, falling back to a cached copy, then the offline page.
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(PAGES_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(request);
    return cached || (await cache.match(OFFLINE_URL));
  }
}

// Cache-first for hashed, immutable build output.
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

// Stale-while-revalidate for icons/manifest/logo.
async function handleRevalidatingAsset(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isExcluded(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isHashedBuildAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  if (isRevalidatingAsset(url.pathname)) {
    event.respondWith(handleRevalidatingAsset(request));
    return;
  }

  // Everything else: straight to network, never cached.
});
