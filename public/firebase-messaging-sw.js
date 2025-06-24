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

// Enhanced mobile detection
const isMobile = () => {
  if (typeof navigator !== 'undefined') {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return false;
};

const isAndroidChrome = () => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    return ua.includes('Android') && ua.includes('Chrome') && !ua.includes('Edge');
  }
  return false;
};

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
  const mobile = isMobile();
  const androidChrome = isAndroidChrome();
  
  console.log('📱 Service worker device info:', { mobile, androidChrome, currentDomain });
  
  const notificationTitle = payload.notification?.title || 'BooqIt Notification';
  
  // Base notification options
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: `${currentDomain}/icons/icon-192.png`,
    badge: `${currentDomain}/icons/icon-192.png`,
    tag: 'booqit-notification',
    requireInteraction: !androidChrome, // Less intrusive for Android Chrome
    silent: false,
    data: { 
      ...payload.data, 
      click_action: currentDomain,
      app_name: 'BooqIt'
    }
  };
  
  // Enhanced options for Android Chrome
  if (androidChrome) {
    Object.assign(notificationOptions, {
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open BooqIt',
          icon: `${currentDomain}/icons/icon-192.png`
        }
      ]
    });
  } else if (mobile) {
    // Other mobile devices
    Object.assign(notificationOptions, {
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open BooqIt',
          icon: `${currentDomain}/icons/icon-192.png`
        }
      ]
    });
  } else {
    // Desktop
    Object.assign(notificationOptions, {
      actions: [
        {
          action: 'open',
          title: 'Open BooqIt',
          icon: `${currentDomain}/icons/icon-192.png`
        }
      ]
    });
  }

  console.log('🔔 Showing notification with options:', notificationOptions);

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  console.log('📱 Click device info:', { 
    isMobile: isMobile(), 
    isAndroidChrome: isAndroidChrome() 
  });

  event.notification.close();
  
  const currentDomain = getCurrentDomain();
  const targetUrl = event.notification.data?.click_action || currentDomain;

  console.log('🔔 Opening URL:', targetUrl);

  // Enhanced window handling for Android Chrome
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('🔔 Found clients:', clientList.length);
        
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(new URL(currentDomain).hostname) && 'focus' in client) {
            console.log('🔔 Focusing existing client');
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          console.log('🔔 Opening new window');
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('❌ Error handling notification click:', error);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed:', event);
});

// Enhanced service worker activation for Android Chrome
self.addEventListener('activate', (event) => {
  console.log('🔄 Service worker activated');
  
  if (isAndroidChrome()) {
    console.log('📱 Android Chrome service worker ready');
  }
  
  event.waitUntil(self.clients.claim());
});

// Enhanced installation for Android Chrome
self.addEventListener('install', (event) => {
  console.log('📦 Service worker installed');
  
  if (isAndroidChrome()) {
    console.log('📱 Android Chrome service worker installed');
  }
  
  self.skipWaiting();
});
