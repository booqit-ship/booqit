
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { toast } from "sonner";

const firebaseConfig = {
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4",
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a",
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
    console.log('🔥 Firebase messaging initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase messaging initialization failed:', error);
}

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

    console.log('📱 Getting FCM token...');
    
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ No notification permission, cannot get FCM token');
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

    // Get FCM token
    const vapidKey = "BM8lNTz2mp7qadGhOrQ2e_W1TGkxD_HJqFPuoTiw3-aEZsq30c_D2RkUrSJGNRNEiTEsEcGQhpWnZRlbBjH7xNo";
    
    const tokenOptions: any = {
      vapidKey
    };
    
    // Use service worker registration if available
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    const token = await getToken(messaging, tokenOptions);
    
    if (token) {
      console.log('✅ FCM token obtained:', token.substring(0, 30) + '...');
      
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
      
      return token;
    } else {
      console.log('❌ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// Simplified setup function for use in hooks
export const setupNotifications = async (): Promise<string | null> => {
  console.log('🔔 Setting up notifications...');
  
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
