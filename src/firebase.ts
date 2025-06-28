
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { toast } from "sonner";

// Correct web Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDB3Lm4ni3jz0oQjgQPye4Pedau_H3S-4", // Web API key
  authDomain: "booqit09-f4cfc.firebaseapp.com",
  projectId: "booqit09-f4cfc",
  storageBucket: "booqit09-f4cfc.firebasestorage.app",
  messagingSenderId: "486416254991",
  appId: "1:486416254991:web:3aaa6b9fb5c5a6f5d2fb7a", // Web app ID
  measurementId: "G-14QPC3C9TJ"
};

const app = initializeApp(firebaseConfig);

// Enhanced device detection for cross-platform compatibility
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  return {
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isiOS: /iPhone|iPad|iPod/i.test(ua),
    isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
    isFirefox: /Firefox/i.test(ua),
    isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
    isEdge: /Edge/i.test(ua),
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    platform: navigator.platform
  };
};

// Initialize messaging with proper error handling
let messaging: any = null;
try {
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
    console.log('🔥 Firebase messaging initialized with web configuration');
    console.log('🔧 Device info:', getDeviceInfo());
  }
} catch (error) {
  console.error('❌ Firebase messaging initialization failed:', error);
}

// Global state management for token requests
let tokenRequestInProgress = false;
let lastTokenRequest = 0;
const TOKEN_REQUEST_COOLDOWN = 10000; // Reduced to 10 seconds for better UX

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const deviceInfo = getDeviceInfo();
    console.log('🔔 Requesting notification permission on:', deviceInfo);

    if (!("Notification" in window)) {
      console.error('❌ Notifications not supported on this browser');
      toast.error('Notifications are not supported on this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    // Enhanced permission request with device-specific messaging
    let permissionResult;
    if (deviceInfo.isiOS && deviceInfo.isSafari) {
      // iOS Safari requires user gesture
      toast.info('Please allow notifications when prompted');
      permissionResult = await Notification.requestPermission();
    } else {
      permissionResult = await Notification.requestPermission();
    }

    console.log('🔔 Permission result:', permissionResult);

    if (permissionResult === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      const deviceSpecificMessage = deviceInfo.isiOS 
        ? 'Enable notifications in Safari settings for this site'
        : 'Click the notification icon in your address bar to enable notifications';
      
      toast.error('Notification permission denied', {
        description: deviceSpecificMessage,
        duration: 8000
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    toast.error('Error requesting notification permission');
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      console.error('❌ Firebase messaging not initialized');
      return null;
    }

    const now = Date.now();
    if (tokenRequestInProgress) {
      console.log('⏳ Token request already in progress');
      return null;
    }

    if (now - lastTokenRequest < TOKEN_REQUEST_COOLDOWN) {
      console.log('⏳ Token request cooldown active');
      return null;
    }

    tokenRequestInProgress = true;
    lastTokenRequest = now;

    const deviceInfo = getDeviceInfo();
    console.log('📱 Getting FCM token for device:', deviceInfo);

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('❌ No notification permission');
      tokenRequestInProgress = false;
      return null;
    }

    // Register service worker with enhanced error handling
    let registration: ServiceWorkerRegistration | undefined;
    
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('✅ Service worker registered:', registration.scope);
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready');
      } catch (swError) {
        console.error('❌ Service worker registration failed:', swError);
        // Continue without service worker - some browsers/modes might not support it
      }
    }

    // Correct VAPID key for web push
    const vapidKey = "BOw6E7dmADiUQUPalRz3k8o6jtBDKRx4VJHo1q_A24d9ONp8ovN1WCkVDVERyhc0NcK_f9QHaUy1MaCLC5q1_L4";
    
    const tokenOptions: any = { vapidKey };
    
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    console.log('🔑 Requesting FCM token with web VAPID key...');
    const token = await getToken(messaging, tokenOptions);
    
    if (token) {
      console.log('✅ FCM token obtained successfully');
      console.log('🔧 Token configuration:', {
        hasServiceWorker: !!registration,
        deviceInfo,
        tokenLength: token.length
      });
      
      // Set up foreground message handling
      onMessage(messaging, (payload: MessagePayload) => {
        console.log('📱 Foreground message received:', payload);
        
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || 'You have a new notification';
        
        // Show toast notification for foreground messages
        toast(title, {
          description: body,
          duration: 5000,
        });
      });
      
      tokenRequestInProgress = false;
      return token;
    } else {
      console.log('❌ No FCM token received - check configuration');
      tokenRequestInProgress = false;
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    tokenRequestInProgress = false;
    return null;
  }
};

// Simplified setup function
export const setupNotifications = async (): Promise<string | null> => {
  console.log('🔔 Setting up notifications with cross-device compatibility...');
  
  try {
    const token = await getFCMToken();
    if (token) {
      console.log('✅ Cross-device notifications setup complete');
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
