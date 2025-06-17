
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, getFCMToken, setupForegroundMessaging } from '@/firebase';
import { saveUserFCMTokenSimple } from '@/services/simpleNotificationService';
import { toast } from 'sonner';

export const useSimpleNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !userId) {
        console.log('🔔 SIMPLE: User not authenticated, skipping notification setup');
        return;
      }

      if (!('Notification' in window)) {
        console.log('❌ SIMPLE: Notifications not supported');
        return;
      }

      try {
        console.log('🔔 SIMPLE: Initializing notifications for user:', userId);

        // Check permission
        let permission = Notification.permission;
        
        if (permission !== 'granted') {
          console.log('📱 SIMPLE: Requesting notification permission...');
          const granted = await requestNotificationPermission();
          setHasPermission(granted);
          
          if (!granted) {
            console.log('❌ SIMPLE: Permission denied');
            return;
          }
        } else {
          setHasPermission(true);
        }

        // Get FCM token
        console.log('🔑 SIMPLE: Getting FCM token...');
        const token = await getFCMToken();
        
        if (!token) {
          console.log('❌ SIMPLE: No FCM token available');
          return;
        }

        // Save token to profile
        console.log('💾 SIMPLE: Saving FCM token to profile...');
        const result = await saveUserFCMTokenSimple(userId, token);
        
        if (result.success) {
          console.log('✅ SIMPLE: Notifications initialized successfully');
          setIsInitialized(true);
          
          // Setup foreground messaging
          setupForegroundMessaging((payload) => {
            console.log('📱 SIMPLE: Foreground notification received:', payload);
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          console.error('❌ SIMPLE: Failed to save FCM token:', result.error);
        }
      } catch (error) {
        console.error('❌ SIMPLE: Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, [isAuthenticated, userId]);

  const enableNotifications = async () => {
    try {
      if (!userId) {
        toast.error('User not authenticated');
        return false;
      }

      console.log('🔔 SIMPLE MANUAL: Enabling notifications...');
      
      const granted = await requestNotificationPermission();
      setHasPermission(granted);

      if (granted) {
        const token = await getFCMToken();
        if (token) {
          const result = await saveUserFCMTokenSimple(userId, token);
          if (result.success) {
            setIsInitialized(true);
            toast.success('Notifications enabled! 🔔');
            return true;
          }
        }
      }

      toast.error('Failed to enable notifications');
      return false;
    } catch (error) {
      console.error('❌ SIMPLE MANUAL: Error:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  };

  return {
    isInitialized,
    hasPermission,
    enableNotifications
  };
};
