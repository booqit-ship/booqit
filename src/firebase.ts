
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

// Initialize Firebase only once
if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
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
    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Notification permission denied');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('📱 Permission response:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
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

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    
    if (token) {
      console.log('🔑 FCM Token generated:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.error('❌ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

export const setupForegroundMessaging = (callback?: (payload: any) => void) => {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('📲 Foreground message received:', payload);
    
    // Show custom notification for foreground messages
    if (payload.notification) {
      const { title, body } = payload.notification;
      
      // Create custom notification element or toast
      if (callback) {
        callback(payload);
      } else {
        // Default behavior - show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(title || 'BooqIt Notification', {
            body: body || 'You have a new notification',
            icon: '/icons/icon-192.png'
          });
        }
      }
    }
  });
};
