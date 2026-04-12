const CACHE_NAME = 'canvaspro-v2';
const APP_SHELL = ['/'];

// Install: cache the app shell and claim clients immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

// Activate: clean up old caches and take control right away
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      ),
    ])
  );
});

// Fetch: network-first with cache fallback
// - API requests are never cached (always pass through to network)
// - Everything else uses network-first so Vite-hashed assets are always fresh
//   and falls back to the cached version when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls — these must always hit the network
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin requests that aren't CDN assets we want to cache
  const isSameOrigin = url.origin === self.location.origin;
  const isCacheableCDN =
    url.hostname === 'cdn.tailwindcss.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'esm.sh';

  if (!isSameOrigin && !isCacheableCDN) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline fallback: serve from cache, or the app shell for navigation
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/');
        })
      )
  );
});
