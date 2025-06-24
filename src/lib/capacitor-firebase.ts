
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFCMToken } from '@/firebase';

export const setupNotifications = async (): Promise<string | null> => {
  console.log('🔔 Setting up notifications for platform:', Capacitor.getPlatform());
  
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
    // Web platform - use Firebase Web SDK
    console.log('🌐 Web platform detected - using Firebase Web SDK');
    return await getFCMToken();
  }
};
