
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Enhanced logging for cross-platform debugging
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
    // Native platform (iOS/Android app) - Use Capacitor Push Notifications
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
          
          // Timeout after 20 seconds
          setTimeout(() => {
            console.error('⏰ Native registration timeout');
            resolve(null);
          }, 20000);
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
    // Web platform - this should not be called anymore, but handle gracefully
    console.log('🌐 Web platform detected - redirecting to Firebase Web SDK');
    console.warn('⚠️ CAPACITOR-FIREBASE: Web platforms should use direct Firebase integration');
    
    // Return null to indicate this method should not be used for web
    return null;
  }
};
