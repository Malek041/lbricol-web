importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCeTY89i4763jkw7jebB8KuiTyOS-q361E",
  authDomain: "lbricol-6a023.firebaseapp.com",
  projectId: "lbricol-6a023",
  storageBucket: "lbricol-6a023.firebasestorage.app",
  messagingSenderId: "732991989736",
  appId: "1:732991989736:web:d24baee999803a892de65d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/Images/Logo/image-Photoroom%20(2)%20copy%205.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Native Push Listener (handles non-Firebase VAPID messages)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/Images/Logo/image-Photoroom%20(2)%20copy%205.png',
        badge: data.badge || '/Images/Logo/image-Photoroom%20(2)%20copy%205.png',
        data: data.data || {},
        actions: data.actions || []
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'Lbricol', options)
      );
    } catch (e) {
      console.error('Error handling native push event:', e);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
