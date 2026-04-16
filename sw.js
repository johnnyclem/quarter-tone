/* Quarter Tone — Service Worker
 *
 * Powered by Workbox 7 (loaded from the official Google CDN via
 * `importScripts`). The site has no build step, so Workbox is consumed
 * directly rather than via a bundler — this keeps the PWA self-contained
 * and lets us upgrade the SW just by bumping `WB_VERSION` below.
 *
 * Strategy summary
 * ----------------
 * 1. App shell (index.html, manifest, icons) is precached on install so the
 *    cabinet boots fully offline after the first visit.
 * 2. Static assets (scripts, styles, images, fonts) → Cache-First. These
 *    files are content-addressable in spirit (Tone.js is pinned to a
 *    specific version, fonts are immutable, icons rarely change) so the
 *    fastest correct strategy is to serve from cache and only hit the
 *    network on a miss.
 * 3. HTML navigations → Stale-While-Revalidate. Boots instantly from cache
 *    (offline-capable) while a background fetch updates the cabinet for
 *    the next launch.
 */

const WB_VERSION = '7.1.0';
importScripts(
  `https://storage.googleapis.com/workbox-cdn/releases/${WB_VERSION}/workbox-sw.js`
);

// Disable Workbox's verbose logging in production by default.
// Toggle with `self.__WB_DISABLE_DEV_LOGS = false;` from DevTools if needed.
self.__WB_DISABLE_DEV_LOGS = true;

const { precaching, routing, strategies, expiration, cacheableResponse, core } =
  workbox;

// Bumping this string forces a brand-new precache and evicts the previous one.
const APP_VERSION = 'v1';
core.setCacheNameDetails({
  prefix: 'quarter-tone',
  suffix: APP_VERSION,
  precache: 'app-shell',
  runtime: 'runtime',
});

// ---------------------------------------------------------------------------
// 1. Precache the app shell.
//    The list is intentionally small — index.html bundles all of the game
//    code/CSS inline, so once we have the shell + manifest + icons, the
//    cabinet renders fully offline. Each entry has a `revision` so updates
//    are picked up when this file changes.
// ---------------------------------------------------------------------------
precaching.precacheAndRoute([
  { url: './', revision: APP_VERSION },
  { url: './index.html', revision: APP_VERSION },
  { url: './manifest.webmanifest', revision: APP_VERSION },
  { url: './icons/icon.svg', revision: APP_VERSION },
  { url: './icons/icon-maskable.svg', revision: APP_VERSION },
]);

// Serve `/` and other navigations from the cached `index.html` shell when
// offline. Keeps deep links working without a server round-trip.
precaching.cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// 2. Runtime caching — cache-first for static assets.
// ---------------------------------------------------------------------------

// Tone.js (and any other CDN scripts we may add) — cache-first, long TTL.
routing.registerRoute(
  ({ url, request }) =>
    request.destination === 'script' &&
    (url.origin === 'https://cdnjs.cloudflare.com' ||
      url.origin === 'https://unpkg.com'),
  new strategies.CacheFirst({
    cacheName: `quarter-tone-cdn-scripts-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Google Fonts stylesheet — cache-first (the URL is content-stable for a
// given font family + weight set).
routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new strategies.CacheFirst({
    cacheName: `quarter-tone-google-fonts-css-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// Google Fonts webfont files (woff2) — immutable, cache-first forever.
routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new strategies.CacheFirst({
    cacheName: `quarter-tone-google-fonts-webfonts-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// Same-origin static assets (scripts, styles, workers) — cache-first.
routing.registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin &&
    ['script', 'style', 'worker'].includes(request.destination) &&
    !url.pathname.endsWith('/sw.js'),
  new strategies.CacheFirst({
    cacheName: `quarter-tone-static-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Same-origin images / icons / fonts — cache-first.
routing.registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin &&
    ['image', 'font'].includes(request.destination),
  new strategies.CacheFirst({
    cacheName: `quarter-tone-media-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
      new expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
      }),
    ],
  })
);

// ---------------------------------------------------------------------------
// 3. HTML navigations — stale-while-revalidate so the cabinet loads instantly
//    and offline, while updates trickle in for the next visit.
//    Precache already handles the canonical URLs above; this rule covers any
//    other navigation request that lands on the same scope.
// ---------------------------------------------------------------------------
routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new strategies.StaleWhileRevalidate({
    cacheName: `quarter-tone-pages-${APP_VERSION}`,
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ---------------------------------------------------------------------------
// Lifecycle: take control of open clients ASAP after an update so the user
// doesn't need a hard refresh to pick up the new SW. The page can still
// post {type:'SKIP_WAITING'} to force activation of a waiting SW (used by
// the "new version available" UI hook in index.html).
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
