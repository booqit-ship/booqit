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

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Keep track of generated tokens to prevent reuse
const generatedTokens = new Set<string>();

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
      return false;
    }

    console.log('📱 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
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

    // First check permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.error('❌ No notification permission');
      return null;
    }

    // Register service worker if not already registered
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('✅ Service worker registered:', registration.scope);
      } catch (swError) {
        console.error('❌ Service worker registration failed:', swError);
      }
    }

    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔑 Attempting to get FCM token (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        const token = await getToken(firebaseMessaging, {
          vapidKey: 'BHxb_iO9YJJv2xXCXeAqLKskkm1K_-u5EhLJEYRdSE8l0KwvqJEO7XkKFzWdWL4AFHqbdF4-AK3yFJ6E2D4vJQE'
        });
        
        if (token) {
          // Ensure token uniqueness per session
          if (generatedTokens.has(token)) {
            console.warn('⚠️ Token already generated in this session, forcing refresh...');
            // Clear token cache and try again
            await navigator.serviceWorker.ready.then(registration => {
              return registration.unregister();
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          generatedTokens.add(token);
          console.log('✅ FCM token obtained:', token.substring(0, 30) + '...');
          console.log('🔒 Token unique for this session');
          return token;
        } else {
          console.warn(`⚠️ No FCM token received on attempt ${attempts}`);
        }
      } catch (error) {
        console.error(`❌ Error getting FCM token on attempt ${attempts}:`, error);
      }
      
      if (attempts < maxAttempts) {
        console.log('⏳ Waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.error('❌ Failed to get FCM token after all attempts');
    return null;
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
      
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('📱 Using service worker notification for mobile browser');
        // Let service worker handle mobile notifications
        return;
      }
      
      // Handle desktop notifications
      if (payload.notification) {
        console.log('🖥️ Showing desktop notification');
        if (onMessageReceived) {
          onMessageReceived(payload);
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
