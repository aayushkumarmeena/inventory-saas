// Deliberately minimal. This is a business app dealing with live stock,
// sales, and financial data — caching API responses would risk showing
// stale numbers, which is worse than not being installable. This worker
// exists only to satisfy PWA installability criteria and to show a plain
// "you're offline" page if there's genuinely no connection at all. It
// never caches or intercepts API calls.

const CACHE = 'inventorypro-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle top-level page navigations; everything else (API calls,
  // JS/CSS bundles, images) passes straight through to the network
  // untouched so the app never serves stale data.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
