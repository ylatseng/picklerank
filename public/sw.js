// PickleRank PWA Service Worker  
// Network-first strategy — ensures live Firestore data always reflects latest changes
const CACHE_NAME = 'picklerank-v2';
const SHELL_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip: Firebase, Google APIs, external services — they handle their own caching
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('google') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('gstatic') ||
      url.protocol === 'chrome-extension:') {
    return; // don't intercept
  }

  // Network-first for HTML and JS (ensures app updates reach users immediately)
  // Falls back to cache only when offline
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => 
        caches.match(event.request).then(r => r || caches.match('/index.html'))
      )
  );
});

// ── Notification scheduling (from sw-notifications.js merged here) ──────────
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
