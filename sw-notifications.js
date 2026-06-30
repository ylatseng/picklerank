// public/sw-notifications.js

const scheduledNotifications = new Map();

self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data && data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, tag, timestamp } = data;
    const delay = timestamp - Date.now();
    
    // Clear any existing notification with this tag first
    if (scheduledNotifications.has(tag)) {
      clearTimeout(scheduledNotifications.get(tag));
      scheduledNotifications.delete(tag);
    }
    
    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          tag,
          icon: '/icon-192.png', 
          vibrate: [200, 100, 200]
        });
        scheduledNotifications.delete(tag);
      }, delay);
      
      scheduledNotifications.set(tag, timeoutId);
    } else {
      // If the time is already past or imminent, show immediately
      self.registration.showNotification(title, {
        body,
        tag,
        icon: '/icon-192.png',
        vibrate: [200, 100, 200]
      });
    }
  } else if (data && data.type === 'CANCEL_NOTIFICATION') {
    const { tag } = data;
    if (scheduledNotifications.has(tag)) {
      clearTimeout(scheduledNotifications.get(tag));
      scheduledNotifications.delete(tag);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      if (windowClients.length > 0) {
        let client = windowClients[0];
        client.focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});