// PickleRank PWA Service Worker v3
// Strategy:
//   - App shell (HTML/JS/CSS): cache-first so the app loads offline
//   - Firebase/Google APIs: never intercepted (they handle their own caching)
//   - Everything else: network-first with cache fallback

const CACHE_NAME = 'picklerank-v3';
const SHELL_URLS = ['/', '/index.html'];

// Install: immediately activate and cache the app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS).catch(() => {}))
  );
});

// Activate: clear old caches, claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Firebase, Google, or extension requests
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('gstatic') ||
    url.protocol === 'chrome-extension:'
  ) return;

  // NAVIGATION requests (pull-to-refresh, address bar, link clicks):
  // Serve cached shell immediately — prevents the Chrome offline dino page.
  // This is the key fix: navigation requests must be answered from cache first.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) {
          // Serve cache immediately; update cache in background when online
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response));
            }
          }).catch(() => {});
          return cached;
        }
        // No cache yet — try network
        return fetch(event.request).catch(() => new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding:40px">' +
          '<h2>📶 Offline</h2><p>Please connect to the internet to load PickleRank for the first time.</p>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        ));
      })
    );
    return;
  }

  // ALL OTHER requests (JS, CSS, images): network-first, cache fallback
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});

// ── Notification scheduling ────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, tag, timestamp } = event.data;
    const delay = timestamp - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: '/icon-192.png', badge: '/icon-192.png',
        tag, requireInteraction: false, data: { url: '/' }
      });
    }, Math.min(delay, 2147483647));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
