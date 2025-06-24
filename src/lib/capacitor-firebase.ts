
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFCMToken } from '@/firebase';

// Enhanced logging for debugging
const logPlatformInfo = () => {
  console.log('🔔 CAPACITOR-FIREBASE: Platform detection:', {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  });
};

export const setupNotifications = async (): Promise<string | null> => {
  logPlatformInfo();
  
  if (Capacitor.isNativePlatform()) {
    // Native platform (iOS/Android app)
    try {
      console.log('📱 Native platform detected - using Capacitor Push Notifications');
      
      // Request permission
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        return new Promise((resolve) => {
          // Listen for registration
          PushNotifications.addListener('registration', (token) => {
            console.log('✅ Native FCM token:', token.value);
            resolve(token.value);
          });
          
          // Listen for registration errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Native registration error:', error);
            resolve(null);
          });
          
          // Timeout after 30 seconds
          setTimeout(() => {
            console.error('⏰ Native registration timeout');
            resolve(null);
          }, 30000);
        });
      } else {
        console.log('❌ Native push permission denied');
        return null;
      }
    } catch (error) {
      console.error('❌ Native push setup error:', error);
      return null;
    }
  } else {
    // Web platform - use Firebase Web SDK with enhanced error handling
    console.log('🌐 Web platform detected - using Firebase Web SDK');
    
    try {
      const token = await getFCMToken();
      
      if (token) {
        console.log('✅ CAPACITOR-FIREBASE: Web FCM token obtained successfully');
        return token;
      } else {
        console.log('❌ CAPACITOR-FIREBASE: Failed to get web FCM token');
        return null;
      }
    } catch (error) {
      console.error('❌ CAPACITOR-FIREBASE: Web FCM setup error:', error);
      return null;
    }
  }
};
