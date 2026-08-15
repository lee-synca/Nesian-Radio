/* Nesian FM service worker */
const CACHE = 'nfm-v1';
const SHELL = [
  '/',
  '/about/',
  '/artists/',
  '/how-to-listen/',
  '/news/',
  '/assets/site.css',
  '/manifest.json',
  '/wp-content/uploads/2026/04/NESIAN-FM-Transparent-300x127.png',
  '/wp-content/uploads/2026/04/NESIAN-FM-LOGO-512-x-512-px.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept cross-origin requests — the live stream, now-playing API,
  // fonts and CDNs must always go straight to the network.
  if (url.origin !== self.location.origin) return;

  // HTML pages: network-first (fresh content), fall back to cache/offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache it).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
