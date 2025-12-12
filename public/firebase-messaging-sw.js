// Firebase Cloud Messaging Service Worker
// This service worker handles push notifications when the app is closed or in background

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration will be injected from the main app
// For now, we handle messages with a basic config
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  let notificationData = {
    title: 'Emergency Alert',
    body: 'You have a new emergency notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'emergency-notification',
    requireInteraction: true,
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push data:', payload);
      
      notificationData = {
        title: payload.notification?.title || payload.data?.title || 'Emergency Alert',
        body: payload.notification?.body || payload.data?.body || 'You have a new emergency notification',
        icon: payload.notification?.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: payload.data?.tag || 'emergency-notification',
        requireInteraction: true,
        data: {
          url: payload.data?.click_action || payload.notification?.click_action || '/',
          ...payload.data
        }
      };
    } catch (e) {
      console.log('[Service Worker] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background message
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Firebase Messaging SW loaded');
