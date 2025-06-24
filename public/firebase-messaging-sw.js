
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4",
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a",
  measurementId: "G-14QPC3C9TJ"
});

const messaging = firebase.messaging();

// Get current domain for click actions
const getCurrentDomain = () => {
  if (typeof location !== 'undefined') {
    return location.origin;
  }
  // Use the actual preview domain for Lovable
  return 'https://preview--booqit.lovable.app';
};

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Background message received:', payload);
  
  const currentDomain = getCurrentDomain();
  
  const notificationTitle = payload.notification?.title || 'BooqIt Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: `${currentDomain}/icons/icon-192.png`,
    badge: `${currentDomain}/icons/icon-192.png`,
    tag: 'booqit-notification',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open BooqIt',
        icon: `${currentDomain}/icons/icon-192.png`
      }
    ],
    data: { 
      ...payload.data, 
      click_action: currentDomain,
      app_name: 'BooqIt'
    }
  };

  console.log('🔔 Showing notification with domain:', currentDomain, notificationOptions);

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);

  event.notification.close();
  
  const currentDomain = getCurrentDomain();
  const targetUrl = event.notification.data?.click_action || currentDomain;

  console.log('🔔 Opening URL:', targetUrl);

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(new URL(currentDomain).hostname) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed:', event);
});
