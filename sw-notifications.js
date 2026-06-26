// PickleRank Notification Service Worker
// Handles scheduled push notifications for upcoming events

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Listen for scheduled notification messages from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, tag, timestamp } = event.data;
    const delay = timestamp - Date.now();
    if (delay <= 0) return;
    // Use setTimeout — works for short delays (< 1 day)
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag,
        requireInteraction: false,
        data: { url: '/' }
      });
    }, Math.min(delay, 2147483647)); // clamp to max safe timeout
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
