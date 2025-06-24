
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Use correct web Firebase configuration (matching main app)
firebase.initializeApp({
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4", // Web API key
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a", // Web app ID
  measurementId: "G-14QPC3C9TJ"
});

const messaging = firebase.messaging();

// Enhanced cross-device detection
const getDeviceInfo = () => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isAndroid: /Android/i.test(ua),
      isiOS: /iPhone|iPad|iPod/i.test(ua),
      isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
      isFirefox: /Firefox/i.test(ua),
      isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
      isEdge: /Edge/i.test(ua),
      isPWA: self.matchMedia && self.matchMedia('(display-mode: standalone)').matches
    };
  }
  return { isMobile: false, isAndroid: false, isiOS: false, isChrome: false };
};

// Get current domain with fallback
const getCurrentDomain = () => {
  if (typeof location !== 'undefined') {
    return location.origin;
  }
  return 'https://preview--booqit.lovable.app';
};

console.log('🔄 SW: Firebase messaging service worker initialized with web config');
console.log('🔧 SW: Device info:', getDeviceInfo());
console.log('🔧 SW: Firebase config:', firebase.app().options);

// Handle background messages with cross-device compatibility
messaging.onBackgroundMessage((payload) => {
  console.log('📱 SW: Background message received:', payload);
  
  const currentDomain = getCurrentDomain();
  const deviceInfo = getDeviceInfo();
  
  console.log('📱 SW: Processing notification for device:', deviceInfo);
  
  const notificationTitle = payload.notification?.title || 'BooqIt Notification';
  const notificationBody = payload.notification?.body || 'You have a new notification';
  
  // Cross-device notification options
  const notificationOptions = {
    body: notificationBody,
    icon: `${currentDomain}/icons/icon-192.png`,
    badge: `${currentDomain}/icons/icon-192.png`,
    tag: 'booqit-notification',
    requireInteraction: deviceInfo.isMobile, // Keep visible on mobile
    silent: false,
    data: { 
      ...payload.data, 
      click_action: currentDomain,
      app_name: 'BooqIt',
      timestamp: Date.now(),
      deviceInfo: deviceInfo
    }
  };
  
  // Add device-specific enhancements
  if (deviceInfo.isMobile) {
    notificationOptions.vibrate = [200, 100, 200];
    // Add actions for mobile devices
    notificationOptions.actions = [
      {
        action: 'open',
        title: 'Open App',
        icon: `${currentDomain}/icons/icon-192.png`
      }
    ];
  }
  
  // iOS Safari specific handling
  if (deviceInfo.isiOS && deviceInfo.isSafari) {
    // iOS Safari has limited notification support
    notificationOptions.requireInteraction = true;
  }

  console.log('🔔 SW: Showing notification with options:', notificationOptions);

  // Always use service worker registration for cross-device compatibility
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Enhanced notification click handling for all devices
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 SW: Notification clicked:', event);
  
  const deviceInfo = getDeviceInfo();
  console.log('📱 SW: Click on device:', deviceInfo);

  event.notification.close();
  
  const currentDomain = getCurrentDomain();
  const targetUrl = event.notification.data?.click_action || currentDomain;

  console.log('🔔 SW: Opening URL:', targetUrl);

  // Cross-device window handling
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log('🔔 SW: Found clients:', clientList.length);
      
      // Try to focus existing window first
      for (const client of clientList) {
        if (client.url.includes(new URL(currentDomain).hostname) && 'focus' in client) {
          console.log('🔔 SW: Focusing existing client');
          return client.focus();
        }
      }
      
      // Open new window with device-specific handling
      if (clients.openWindow) {
        console.log('🔔 SW: Opening new window');
        return clients.openWindow(targetUrl);
      }
    }).catch((error) => {
      console.error('❌ SW: Error handling notification click:', error);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 SW: Notification closed on device:', getDeviceInfo());
});

// Enhanced service worker lifecycle
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Service worker activated with web config');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', (event) => {
  console.log('📦 SW: Service worker installed with web config');
  self.skipWaiting();
});

// Handle push events for additional reliability across devices
self.addEventListener('push', (event) => {
  console.log('📨 SW: Push event received:', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('📨 SW: Push payload:', payload);
    
    const deviceInfo = getDeviceInfo();
    const currentDomain = getCurrentDomain();
    
    const notificationTitle = payload.notification?.title || 'BooqIt Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: `${currentDomain}/icons/icon-192.png`,
      badge: `${currentDomain}/icons/icon-192.png`,
      tag: 'booqit-push-notification',
      requireInteraction: deviceInfo.isMobile,
      data: { ...payload.data, deviceInfo }
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});
