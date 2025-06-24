import { FirebaseApp, initializeApp } from 'firebase/app';
import { Messaging, getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4",
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a",
  measurementId: "G-14QPC3C9TJ"
};

// Updated VAPID key provided by user
const VAPID_KEY = 'BOw6E7dmADiUQUPalRz3k8o6jtBDKRx4VJHo1q_A24d9ONp8ovN1WCkVDVERyhc0NcK_f9QHaUy1MaCLC5q1_L4';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Keep track of generated tokens to prevent reuse
// let generatedTokens = new Set<string>(); // Remove this line

// Enhanced mobile detection for Android Chrome
const isMobile = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isAndroidChrome = () => {
  const ua = navigator.userAgent;
  return ua.includes('Android') && ua.includes('Chrome') && !ua.includes('Edge');
};

export const initializeFirebase = (): FirebaseApp => {
  if (!app) {
    console.log('🔥 Initializing Firebase app...');
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseMessaging = (): Messaging | null => {
  try {
    if (!messaging && typeof window !== 'undefined') {
      const firebaseApp = initializeFirebase();
      messaging = getMessaging(firebaseApp);
      console.log('📱 Firebase messaging initialized');
    }
    return messaging;
  } catch (error) {
    console.error('❌ Error initializing Firebase messaging:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.log('❌ This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Notification permission denied');
      
      // For Android Chrome, provide specific guidance
      if (isAndroidChrome()) {
        console.log('📱 Android Chrome detected - user needs to manually enable notifications in site settings');
      }
      return false;
    }

    console.log('📱 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Show a test notification for Android Chrome to confirm it works
      if (isAndroidChrome()) {
        console.log('📱 Android Chrome: Showing test notification');
        // Create notification options with proper typing
        const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
          body: 'You will now receive booking updates on your Android device.',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'android-chrome-test',
          requireInteraction: false,
          silent: false
        };
        
        // Add vibrate if supported
        if ('vibrate' in navigator) {
          notificationOptions.vibrate = [200, 100, 200];
        }
        
        new Notification('🔔 BooqIt Notifications Enabled!', notificationOptions);
      }
      
      return true;
    } else {
      console.log('❌ Notification permission denied by user');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

export const setupNotifications = async (): Promise<string | null> => {
  try {
    console.log('🔄 Setting up FCM notifications...');
    
    const firebaseMessaging = getFirebaseMessaging();
    if (!firebaseMessaging) {
      console.error('❌ Firebase messaging not available');
      return null;
    }

    // Simple permission check
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.error('❌ No notification permission');
      return null;
    }

    // Register service worker if needed
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready');
      } catch (swError) {
        console.error('❌ Service worker registration failed:', swError);
      }
    }

    // Get FCM token - simplified, no loops
    console.log('🔑 Getting FCM token...');
    const token = await getToken(firebaseMessaging, {
      vapidKey: VAPID_KEY
    });
    
    if (token) {
      console.log('✅ FCM token obtained:', token.substring(0, 30) + '...');
      return token;
    } else {
      console.log('❌ No FCM token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in setupNotifications:', error);
    return null;
  }
};

export const setupForegroundMessaging = (onMessageReceived?: (payload: MessagePayload) => void) => {
  try {
    const firebaseMessaging = getFirebaseMessaging();
    if (!firebaseMessaging) {
      console.error('❌ Firebase messaging not available for foreground setup');
      return;
    }

    console.log('📲 Setting up foreground message handling...');
    
    onMessage(firebaseMessaging, (payload) => {
      console.log('📲 Web foreground message received:', payload);
      
      const mobile = isMobile();
      const androidChrome = isAndroidChrome();
      
      console.log('📱 Device info for foreground handling:', { mobile, androidChrome });
      
      if (mobile && androidChrome) {
        console.log('📱 Android Chrome: Enhanced notification handling');
        // For Android Chrome, create browser notification with enhanced options
        if (payload.notification && Notification.permission === 'granted') {
          // Create notification options with proper typing
          const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
            body: payload.notification.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'booqit-android-chrome',
            requireInteraction: true,
            silent: false,
            data: payload.data
          };
          
          // Add vibrate if supported
          if ('vibrate' in navigator) {
            notificationOptions.vibrate = [200, 100, 200];
          }
          
          const notification = new Notification(payload.notification.title || 'BooqIt', notificationOptions);
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      } else if (mobile) {
        console.log('📱 Using service worker notification for mobile browser');
        // Let service worker handle other mobile notifications
        return;
      } else {
        // Handle desktop notifications
        if (payload.notification) {
          console.log('🖥️ Showing desktop notification');
          if (onMessageReceived) {
            onMessageReceived(payload);
          }
        }
      }
    });
    
    console.log('✅ Foreground messaging setup complete');
  } catch (error) {
    console.error('❌ Error setting up foreground messaging:', error);
  }
};

export const getFirebaseAuth = () => {
  const firebaseApp = initializeFirebase();
  return getAuth(firebaseApp);
};
