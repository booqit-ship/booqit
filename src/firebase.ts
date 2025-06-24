
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { toast } from "sonner";

// Use the correct Firebase configuration that matches Android
const firebaseConfig = {
  apiKey: "AIzaSyBZXQp0IuO9nQBFUyhLRGsnRuLTJ-UQu44", // Use Android API key for consistency
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:android:e30bffb187fd8e0ad2fb7a", // Use Android app ID
  measurementId: "G-14QPC3C9TJ"
};

const app = initializeApp(firebaseConfig);

// Enhanced mobile detection
const isMobile = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return false;
};

const isAndroidChrome = (): boolean => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    return ua.includes('Android') && ua.includes('Chrome') && !ua.includes('Edge');
  }
  return false;
};

// Initialize messaging with error handling
let messaging: any = null;
try {
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
    console.log('🔥 Firebase messaging initialized successfully with Android config');
  }
} catch (error) {
  console.error('❌ Firebase messaging initialization failed:', error);
}

// Global state to prevent multiple simultaneous token requests
let tokenRequestInProgress = false;
let lastTokenRequest = 0;
const TOKEN_REQUEST_COOLDOWN = 30000; // 30 seconds cooldown between requests

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('🔔 Requesting notification permission...');
    
    if (!("Notification" in window)) {
      console.error('❌ This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    // For Android Chrome, be more explicit about the permission request
    const permission = await Notification.requestPermission();
    console.log('🔔 Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      console.error('❌ Firebase messaging not initialized');
      return null;
    }

    // Prevent multiple simultaneous requests
    const now = Date.now();
    if (tokenRequestInProgress) {
      console.log('⏳ Token request already in progress, waiting...');
      return null;
    }

    if (now - lastTokenRequest < TOKEN_REQUEST_COOLDOWN) {
      console.log('⏳ Token request cooldown active, waiting...');
      return null;
    }

    tokenRequestInProgress = true;
    lastTokenRequest = now;

    console.log('📱 Getting FCM token with Android configuration...');
    
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ No notification permission, cannot get FCM token');
      tokenRequestInProgress = false;
      return null;
    }

    // Register service worker if not already registered
    let registration: ServiceWorkerRegistration | undefined;
    
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('✅ Service worker registered:', registration.scope);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready');
      } catch (swError) {
        console.error('❌ Service worker registration failed:', swError);
        // Continue without service worker for development
      }
    }

    // Get FCM token with correct VAPID key for the project
    const vapidKey = "BFyMalp8vStokUxFo9Oaqjl5F8p3lBzXjQG0VNWDWMq_bJM8iYYZOYu5T_ZTQP3uA8L-qrZ-YMNhP2sN7H1LRDQ";
    
    const tokenOptions: any = {
      vapidKey
    };
    
    // Use service worker registration if available
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    console.log('🔑 Requesting FCM token with VAPID key...');
    const token = await getToken(messaging, tokenOptions);
    
    if (token) {
      console.log('✅ FCM token obtained:', token.substring(0, 30) + '...');
      console.log('🔧 Token configuration:', {
        hasServiceWorker: !!registration,
        vapidKeyUsed: vapidKey.substring(0, 20) + '...',
        platform: isAndroidChrome() ? 'Android Chrome' : 'Other'
      });
      
      // Set up foreground message handling - NO NOTIFICATION CONSTRUCTOR HERE
      onMessage(messaging, (payload: MessagePayload) => {
        console.log('📱 Foreground message received:', payload);
        
        // For Android Chrome, rely entirely on service worker
        if (isAndroidChrome()) {
          console.log('📱 Android Chrome detected - using service worker only');
          return;
        }
        
        // For other platforms, just show a toast
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || 'You have a new notification';
        
        toast(title, {
          description: body,
          duration: 5000,
        });
      });
      
      tokenRequestInProgress = false;
      return token;
    } else {
      console.log('❌ No FCM token available - check Firebase configuration');
      tokenRequestInProgress = false;
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    console.error('🔧 Error details:', {
      errorCode: (error as any)?.code,
      errorMessage: (error as any)?.message,
      customData: (error as any)?.customData
    });
    tokenRequestInProgress = false;
    return null;
  }
};

// Simplified setup function for use in hooks
export const setupNotifications = async (): Promise<string | null> => {
  console.log('🔔 Setting up notifications with enhanced error handling...');
  
  try {
    const token = await getFCMToken();
    if (token) {
      console.log('✅ Notifications setup complete');
      return token;
    } else {
      console.log('❌ Failed to setup notifications');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in setupNotifications:', error);
    return null;
  }
};

export { app };
