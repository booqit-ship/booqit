
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4",
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a",
  measurementId: "G-14QPC3C9TJ"
};

const VAPID_KEY = "BKvU-PqQVLX4l5_UF0Ps1g4wFLH38gUO5ahkyYP7MipfUauIasKBLTZrc_bJhDpGb4-e7hebZoJDaYP1zRiht3w";

let app;
let messaging;
let serviceWorkerReady = false;

// Initialize Firebase only once and ensure proper Service Worker setup
if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  
  // Enhanced Service Worker registration with proper waiting
  if ('serviceWorker' in navigator) {
    // Register the Service Worker and wait for it to be ready
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(async (registration) => {
        console.log('✅ Service Worker registered successfully:', registration);
        
        // Wait for the Service Worker to be ready and active
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker is now ready and active');
        
        // Check if the Service Worker is controlling the page
        if (navigator.serviceWorker.controller) {
          console.log('✅ Service Worker is controlling the page');
          serviceWorkerReady = true;
        } else {
          console.log('⚠️ Waiting for Service Worker to control the page...');
          // Wait for the controllerchange event
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('✅ Service Worker now controlling the page');
            serviceWorkerReady = true;
          });
        }
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
        serviceWorkerReady = false;
      });
  } else {
    console.error('❌ Service Workers not supported in this browser');
  }
}

export { messaging };

export const requestNotificationPermission = async () => {
  try {
    console.log('🔔 Requesting notification permission...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('❌ Notifications not supported');
      return false;
    }

    // Check current permission
    let permission = Notification.permission;
    console.log('📱 Current permission status:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (permission === 'denied') {
      console.log('❌ Notification permission denied by user');
      alert('Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Set Notifications to "Allow"\n3. Refresh the page');
      return false;
    }

    // Request permission
    permission = await Notification.requestPermission();
    console.log('📱 Permission response:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Test browser notification capability
      new Notification('BooqIt Notifications Enabled! 🔔', {
        body: 'You will now receive booking updates and reminders.',
        icon: '/icons/icon-192.png',
        tag: 'permission-granted'
      });
      
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    return false;
  }
};

// Enhanced FCM token generation with proper Service Worker waiting
export const getFCMToken = async () => {
  try {
    if (!messaging) {
      console.error('❌ Firebase messaging not initialized');
      return null;
    }

    // Check permission first
    if (Notification.permission !== 'granted') {
      console.error('❌ Notification permission not granted');
      return null;
    }

    // Wait for Service Worker to be ready with timeout
    console.log('⏳ Waiting for Service Worker to be ready...');
    const maxWaitTime = 10000; // 10 seconds timeout
    const startTime = Date.now();
    
    while (!serviceWorkerReady && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
    }
    
    if (!serviceWorkerReady) {
      console.error('❌ Service Worker not ready within timeout period');
      
      // Try to check Service Worker status manually
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (registration) {
          console.log('📱 Service Worker registration found:', registration);
          if (registration.active) {
            console.log('✅ Service Worker is active, proceeding anyway...');
          } else {
            console.error('❌ Service Worker is not active');
            return null;
          }
        } else {
          console.error('❌ No Service Worker registration found');
          return null;
        }
      }
    }

    console.log('🔑 Getting FCM token with VAPID key...');
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      // Explicitly specify the Service Worker
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    });
    
    if (token) {
      console.log('🔑 FCM Token generated successfully:', token.substring(0, 20) + '...');
      console.log('📱 Full token for debugging:', token);
      return token;
    } else {
      console.error('❌ No FCM token available - check VAPID key and Service Worker status');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    
    // Additional debugging for Service Worker issues
    if (error.message.includes('Service Worker') || error.message.includes('PushManager')) {
      console.error('🔍 Service Worker debugging:');
      
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          console.log('📱 Current SW registration:', registration);
          
          if (registration) {
            console.log('📱 SW state:', registration.active?.state);
            console.log('📱 SW scope:', registration.scope);
            console.log('📱 SW controlling:', navigator.serviceWorker.controller ? 'Yes' : 'No');
          }
        } catch (swError) {
          console.error('❌ Error checking Service Worker:', swError);
        }
      }
    }
    
    return null;
  }
};

export const setupForegroundMessaging = (callback?: (payload: any) => void) => {
  if (!messaging) {
    console.log('❌ Messaging not available for foreground setup');
    return;
  }

  console.log('🔔 Setting up foreground message handling...');

  onMessage(messaging, (payload) => {
    console.log('📲 Foreground message received:', payload);
    
    // Always show browser notification for foreground messages
    if (payload.notification && Notification.permission === 'granted') {
      const { title, body } = payload.notification;
      
      console.log('🔔 Creating browser notification:', { title, body });
      
      const notification = new Notification(title || 'BooqIt Notification', {
        body: body || 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'foreground-notification',
        requireInteraction: true,
        silent: false,
        data: payload.data
      });

      // Handle notification click
      notification.onclick = () => {
        console.log('🔔 Foreground notification clicked');
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
    
    // Also call the callback if provided
    if (callback) {
      callback(payload);
    }
  });
};
