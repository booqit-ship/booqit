
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

// Updated VAPID key - the current one seems to be causing 401 errors
const VAPID_KEY = "BKvU-PqQVLX4l5_UF0Ps1g4wFLH38gUO5ahkyYP7MipfUauIasKBLTZrc_bJhDpGb4-e7hebZoJDaYP1zRiht3w";

let app;
let messaging;
let isInitialized = false;

// Initialize Firebase only once
if (!isInitialized && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  isInitialized = true;
} else if (getApps().length > 0) {
  app = getApp();
  isInitialized = true;
}

// Initialize messaging for web only, with error handling
if (!Capacitor.isNativePlatform() && isInitialized) {
  try {
    messaging = getMessaging(app);
    
    // Register service worker for web notifications with better error handling
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
          // Set the service worker registration for messaging
          if (messaging && registration) {
            console.log('🔧 Linking service worker to messaging');
          }
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
  } catch (error) {
    console.error('❌ Firebase messaging initialization failed:', error);
    messaging = null;
  }
}

export { messaging };

// Detect if we're on a mobile browser
const isMobileBrowser = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

// Unified notification permission request for both web and native
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      console.log('🔔 Requesting native notification permission...');
      
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const requestResult = await PushNotifications.requestPermissions();
        return requestResult.receive === 'granted';
      }
      
      return permStatus.receive === 'granted';
    } else {
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

// Get FCM token with improved error handling and retry logic
export const setupNotifications = async (): Promise<string | null> => {
  try {
    if (Capacitor.isNativePlatform()) {
      console.log('🔔 Setting up native push notifications...');
      
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

      await PushNotifications.register();
      return null;
    } else {
      // Web platform - get FCM token with better error handling and validation
      if (!messaging) {
        console.error('❌ Firebase messaging not initialized');
        return null;
      }

      // Check permission first
      if (Notification.permission !== 'granted') {
        console.error('❌ Notification permission not granted');
        return null;
      }

      // Check if we're online
      if (!navigator.onLine) {
        console.warn('⚠️ Device is offline, cannot get FCM token');
        return null;
      }

      // Wait a bit for service worker to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔑 Getting FCM token for web...');
      
      try {
        // First check if service worker is ready
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (!registration) {
            console.error('❌ Service Worker not ready');
            return null;
          }
        }

        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined
        });
        
        if (token) {
          console.log('🔑 FCM Token generated:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.error('❌ No FCM token available - user may have denied permission or service worker not ready');
          return null;
        }
      } catch (tokenError: any) {
        console.error('❌ FCM token generation failed:', tokenError);
        
        // More specific error handling
        if (tokenError.code === 'messaging/token-subscribe-failed') {
          console.error('❌ FCM subscription failed - VAPID key may be invalid or Firebase project misconfigured');
        } else if (tokenError.code === 'messaging/permission-blocked') {
          console.error('❌ FCM permission blocked by user');
        } else if (tokenError.code === 'messaging/notifications-blocked') {
          console.error('❌ Notifications are blocked in browser settings');
        }
        
        return null;
      }
    }
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
    return null;
  }
};

// Setup foreground message handling for web with mobile browser support
export const setupForegroundMessaging = (callback?: (payload: any) => void) => {
  if (!Capacitor.isNativePlatform() && messaging) {
    console.log('🔔 Setting up web foreground messaging...');

    onMessage(messaging, async (payload) => {
      console.log('📲 Web foreground message received:', payload);
      
      try {
        if (payload.notification && Notification.permission === 'granted') {
          const title = payload.notification.title || 'BooqIt Notification';
          const baseUrl = window.location.origin;
          
          const options = {
            body: payload.notification.body || 'You have a new notification',
            icon: `${baseUrl}/icons/icon-192.png`,
            badge: `${baseUrl}/icons/icon-192.png`,
            tag: 'booqit-notification',
            requireInteraction: true,
            data: {
              ...payload.data,
              app_name: 'BooqIt',
              click_action: baseUrl
            }
          };

          // For mobile browsers, use service worker registration
          if (isMobileBrowser() && 'serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.ready;
              if (registration && registration.showNotification) {
                console.log('📱 Using service worker notification for mobile browser');
                await registration.showNotification(title, options);
              } else {
                console.warn('⚠️ Service worker registration not available for notifications');
              }
            } catch (swError) {
              console.error('❌ Service worker notification failed:', swError);
              // Fallback to basic notification if service worker fails
              try {
                if (window.Notification && typeof window.Notification === 'function') {
                  new window.Notification(title, options);
                }
              } catch (fallbackError) {
                console.error('❌ Fallback notification also failed:', fallbackError);
              }
            }
          } else {
            // For desktop browsers, use regular Notification constructor
            console.log('🖥️ Using regular notification for desktop browser');
            const notification = new Notification(title, options);
            
            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            // Auto-close after 10 seconds
            setTimeout(() => {
              notification.close();
            }, 10000);
          }
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
  }
};
