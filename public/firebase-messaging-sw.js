// Service worker for background push notifications
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const notificationTitle = payload.notification ? payload.notification.title : 'Arise Academy Alert';
      const notificationOptions = {
        body: payload.notification ? payload.notification.body : 'You have a new message.',
        icon: '/favicon.ico',
        data: payload.data || {},
      };

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Arise Academy Alert', {
          body: text,
          icon: '/favicon.ico',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow && clients.openWindow('/')
  );
});
