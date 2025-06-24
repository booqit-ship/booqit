importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Use consistent Firebase configuration with Android
firebase.initializeApp({
  apiKey: "AIzaSyBZXQp0IuO9nQBFUyhLRGsnRuLTJ-UQu44", // Use Android API key
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:android:e30bffb187fd8e0ad2fb7a", // Use Android app ID
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
  return 'https://preview--booqit.lovable.app';
};

console.log('🔄 SW: Firebase messaging service worker initialized with Android config');

// Handle background messages (when app is not in focus) - CRITICAL FOR ANDROID CHROME
messaging.onBackgroundMessage((payload) => {
  console.log('📱 SW: Background message received:', payload);
  
  const currentDomain = getCurrentDomain();
  const mobile = isMobile();
  const androidChrome = isAndroidChrome();
  
  console.log('📱 SW: Device info:', { mobile, androidChrome, currentDomain });
  console.log('📱 SW: Firebase config used:', firebase.app().options);
  
  const notificationTitle = payload.notification?.title || 'BooqIt Notification';
  
  // Enhanced notification options for all platforms
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: `${currentDomain}/icons/icon-192.png`,
    badge: `${currentDomain}/icons/icon-192.png`,
    tag: 'booqit-notification',
    requireInteraction: true, // Keep notification visible
    silent: false,
    data: { 
      ...payload.data, 
      click_action: currentDomain,
      app_name: 'BooqIt',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open BooqIt',
        icon: `${currentDomain}/icons/icon-192.png`
      }
    ]
  };
  
  // Vibration for mobile devices
  if (mobile) {
    notificationOptions.vibrate = [200, 100, 200, 100, 200];
  }

  console.log('🔔 SW: Showing notification with options:', notificationOptions);

  // ALWAYS use service worker registration for notifications - no Notification constructor
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 SW: Notification clicked:', event);
  console.log('📱 SW: Click device info:', { 
    isMobile: isMobile(), 
    isAndroidChrome: isAndroidChrome() 
  });

  event.notification.close();
  
  const currentDomain = getCurrentDomain();
  const targetUrl = event.notification.data?.click_action || currentDomain;

  console.log('🔔 SW: Opening URL:', targetUrl);

  // Enhanced window handling for all platforms
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('🔔 SW: Found clients:', clientList.length);
      
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(new URL(currentDomain).hostname) && 'focus' in client) {
          console.log('🔔 SW: Focusing existing client:', client.url);
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        console.log('🔔 SW: Opening new window to:', targetUrl);
        return clients.openWindow(targetUrl);
      }
    }).catch((error) => {
      console.error('❌ SW: Error handling notification click:', error);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 SW: Notification closed:', event);
});

// Enhanced service worker activation
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Service worker activated with Android config');
  event.waitUntil(self.clients.claim());
});

// Enhanced installation
self.addEventListener('install', (event) => {
  console.log('📦 SW: Service worker installed with Android config');
  self.skipWaiting();
});

// Handle push events (for additional reliability)
self.addEventListener('push', (event) => {
  console.log('📨 SW: Push event received:', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('📨 SW: Push payload:', payload);
    
    const notificationTitle = payload.notification?.title || 'BooqIt Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'booqit-push-notification',
      requireInteraction: true,
      data: payload.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});
