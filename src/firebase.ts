
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

// Initialize Firebase only once and register service worker
if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  
  // Register service worker for background messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
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
    throw new Error(`Permission request failed: ${error.message}`);
  }
};

export const getFCMToken = async () => {
  try {
    if (!messaging) {
      console.error('❌ Firebase messaging not initialized');
      throw new Error('Firebase messaging not available');
    }

    // Check permission first
    if (Notification.permission !== 'granted') {
      console.error('❌ Notification permission not granted');
      throw new Error('Notification permission not granted');
    }

    console.log('🔑 Getting FCM token with VAPID key...');
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    
    if (token) {
      console.log('🔑 FCM Token generated successfully:', token.substring(0, 20) + '...');
      console.log('📱 Full token for debugging:', token);
      return token;
    } else {
      console.error('❌ No FCM token available - check VAPID key and permissions');
      throw new Error('FCM token generation failed');
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    throw new Error(`FCM token error: ${error.message}`);
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
    
    try {
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
    } catch (error) {
      console.error('❌ Error handling foreground message:', error);
      // Still call callback even if notification display fails
      if (callback) {
        callback(payload);
      }
    }
  });
};
