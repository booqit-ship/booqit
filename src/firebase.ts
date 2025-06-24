
import { initializeApp, getApps, getApp } from "firebase/app";
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

// Updated VAPID key provided by user
const VAPID_KEY = "BOw6E7dmADiUQUPalRz3k8o6jtBDKRx4VJHo1q_A24d9ONp8ovN1WCkVDVERyhc0NcK_f9QHaUy1MaCLC5q1_L4";

// Enhanced mobile detection
const isMobile = () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isAndroidChrome = () => {
  const ua = navigator.userAgent;
  return ua.includes('Android') && ua.includes('Chrome') && !ua.includes('Edge');
};

// Get the current domain for click actions
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://app.booqit.in'; // fallback to production domain
};

let app;
let messaging;

// Initialize Firebase only once and register service worker
if (typeof window !== 'undefined') {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  messaging = getMessaging(app);
  
  // Enhanced service worker registration for Android Chrome
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(async (registration) => {
        console.log('✅ Service Worker registered successfully:', registration);
        
        // For Android Chrome, ensure service worker is active
        if (isAndroidChrome()) {
          console.log('📱 Android Chrome: Waiting for service worker activation...');
          await navigator.serviceWorker.ready;
          console.log('📱 Android Chrome: Service worker ready');
        }
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
    console.log('📱 Device info:', {
      isMobile: isMobile(),
      isAndroidChrome: isAndroidChrome(),
      userAgent: navigator.userAgent
    });
    
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
      
      // Enhanced guidance for Android Chrome
      if (isAndroidChrome()) {
        alert('Notifications are blocked on Android Chrome. To enable:\n\n1. Tap the lock icon in the address bar\n2. Tap "Permissions"\n3. Set "Notifications" to "Allow"\n4. Refresh the page');
      } else {
        alert('Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Set Notifications to "Allow"\n3. Refresh the page');
      }
      return false;
    }

    // Request permission
    permission = await Notification.requestPermission();
    console.log('📱 Permission response:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Test browser notification capability with enhanced options for Android Chrome
      const notificationOptions = {
        body: 'You will now receive booking updates and reminders.',
        icon: '/icons/icon-192.png',
        tag: 'permission-granted'
      };
      
      // Enhanced options for Android Chrome
      if (isAndroidChrome()) {
        Object.assign(notificationOptions, {
          badge: '/icons/icon-192.png',
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200]
        });
      }
      
      new Notification('BooqIt Notifications Enabled! 🔔', notificationOptions);
      
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
    console.log('📱 Device type:', isAndroidChrome() ? 'Android Chrome' : isMobile() ? 'Mobile' : 'Desktop');
    
    // For Android Chrome, add additional wait time
    if (isAndroidChrome()) {
      console.log('📱 Android Chrome: Ensuring service worker is ready...');
      await navigator.serviceWorker.ready;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    
    if (token) {
      console.log('🔑 FCM Token generated successfully:', {
        tokenPreview: token.substring(0, 30) + '...',
        tokenLength: token.length,
        deviceType: isAndroidChrome() ? 'Android Chrome' : isMobile() ? 'Mobile' : 'Desktop'
      });
      return token;
    } else {
      console.error('❌ No FCM token available - check VAPID key and permissions');
      throw new Error('FCM token generation failed');
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    
    // Enhanced error messages for Android Chrome
    if (isAndroidChrome() && error.message?.includes('messaging/permission-blocked')) {
      throw new Error('Android Chrome: Notifications blocked in site settings. Please enable notifications for this site.');
    }
    
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
      const mobile = isMobile();
      const androidChrome = isAndroidChrome();
      
      console.log('📱 Device handling info:', { mobile, androidChrome });
      
      // Always show browser notification for foreground messages with enhanced options
      if (payload.notification && Notification.permission === 'granted') {
        const { title, body } = payload.notification;
        const currentDomain = getCurrentDomain();
        
        console.log('🔔 Creating browser notification with domain:', currentDomain);
        
        const notificationOptions = {
          body: body || 'You have a new notification',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'foreground-notification',
          requireInteraction: !androidChrome, // Less intrusive for Android Chrome
          silent: false,
          data: { ...payload.data, click_action: currentDomain }
        };
        
        // Enhanced options for Android Chrome
        if (androidChrome) {
          Object.assign(notificationOptions, {
            vibrate: [200, 100, 200],
            requireInteraction: false // Less intrusive on mobile
          });
        }
        
        const notification = new Notification(title || 'BooqIt Notification', notificationOptions);

        // Handle notification click
        notification.onclick = () => {
          console.log('🔔 Foreground notification clicked, opening:', currentDomain);
          window.focus();
          notification.close();
        };

        // Auto-close after different times based on device
        const autoCloseTime = androidChrome ? 8000 : 10000;
        setTimeout(() => {
          notification.close();
        }, autoCloseTime);
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
