importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = Object.fromEntries(new URL(self.location.href).searchParams.entries());
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'Emergency Alert';
  const body = payload.data?.body || 'A new emergency alert is available.';
  const path = payload.data?.path || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.alert_id || 'emergency-notification',
    requireInteraction: true,
    data: { path },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedPath = event.notification.data?.path || '/';
  const destination = new URL(requestedPath, self.location.origin);
  if (destination.origin !== self.location.origin) return;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(destination.href);
      return existing.focus();
    }
    return clients.openWindow(destination.href);
  })());
});
