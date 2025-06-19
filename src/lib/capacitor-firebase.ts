import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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

// Initialize Firebase
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize messaging for web only
if (!Capacitor.isNativePlatform()) {
  messaging = getMessaging(app);
  
  // Register service worker for web notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  }
}

export { messaging };

// Unified notification permission request for both web and native
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native platform - use Capacitor Push Notifications
      console.log('🔔 Requesting native notification permission...');
      
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const requestResult = await PushNotifications.requestPermissions();
        return requestResult.receive === 'granted';
      }
      
      return permStatus.receive === 'granted';
    } else {
      // Web platform - use Web Notifications API
      console.log('🔔 Requesting web notification permission...');
      
      if (!('Notification' in window)) {
        console.log('❌ Notifications not supported');
        return false;
      }

      let permission = Notification.permission;
      
      if (permission === 'granted') {
        return true;
      }

      if (permission === 'denied') {
        console.log('❌ Notification permission denied');
        return false;
      }

      permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

// Get FCM token for web, setup native listeners for mobile
export const setupNotifications = async (): Promise<string | null> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native platform - setup Capacitor push notifications
      console.log('🔔 Setting up native push notifications...');
      
      // Add listeners for native notifications
      await PushNotifications.addListener('registration', token => {
        console.log('📱 Native push registration token:', token.value);
      });

      await PushNotifications.addListener('registrationError', err => {
        console.error('❌ Native push registration error:', err.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('📥 Native push notification received:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('👆 Native push notification action performed:', notification);
      });

      // Register with the native platform
      await PushNotifications.register();
      
      return null; // Native doesn't return FCM token directly
    } else {
      // Web platform - get FCM token with better error handling
      if (!messaging) {
        console.error('❌ Firebase messaging not initialized');
        return null;
      }

      // Check if we're online
      if (!navigator.onLine) {
        console.warn('⚠️ Device is offline, cannot get FCM token');
        return null;
      }

      console.log('🔑 Getting FCM token for web...');
      
      try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        
        if (token) {
          console.log('🔑 FCM Token generated:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.error('❌ No FCM token available - user may have denied permission or service worker not ready');
          return null;
        }
      } catch (tokenError: any) {
        console.error('❌ FCM token generation failed:', tokenError);
        
        if (tokenError.code === 'messaging/token-subscribe-failed') {
          console.error('❌ FCM subscription failed - check network connection and service worker');
        } else if (tokenError.code === 'messaging/permission-blocked') {
          console.error('❌ FCM permission blocked by user');
        }
        
        return null;
      }
    }
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
    return null;
  }
};

// Setup foreground message handling for web
export const setupForegroundMessaging = (callback?: (payload: any) => void) => {
  if (!Capacitor.isNativePlatform() && messaging) {
    console.log('🔔 Setting up web foreground messaging...');

    onMessage(messaging, (payload) => {
      console.log('📲 Web foreground message received:', payload);
      
      if (payload.notification && Notification.permission === 'granted') {
        const notification = new Notification(
          payload.notification.title || 'BooqIt Notification',
          {
            body: payload.notification.body || 'You have a new notification',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'foreground-notification',
            data: payload.data
          }
        );

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      if (callback) {
        callback(payload);
      }
    });
  }
};

/*
CAPACITOR DOCUMENTATION LINKS:
- Setup: https://capacitorjs.com/docs/getting-started
- Android: https://capacitorjs.com/docs/android
- Push Notifications: https://capacitorjs.com/docs/apis/push-notifications
- Geolocation: https://capacitorjs.com/docs/apis/geolocation
- Firebase Android: https://firebase.google.com/docs/android/setup
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging/android/client
- Maps Android SDK: https://developers.google.com/maps/documentation/android-sdk/start
*/
