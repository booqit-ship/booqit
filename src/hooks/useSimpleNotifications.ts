
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSimpleNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simple device type detection
  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'web';
  };

  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua)) return 'Chrome Browser';
    if (/Firefox/i.test(ua)) return 'Firefox Browser';
    if (/Safari/i.test(ua)) return 'Safari Browser';
    return 'Browser';
  };

  const registerForNotifications = async () => {
    if (!isAuthenticated || !userId || isRegistered) return;

    setIsLoading(true);
    try {
      console.log('🔔 SIMPLE NOTIFICATIONS: Starting registration for user:', userId);

      // Check permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ Permission denied');
          return;
        }
      }

      // Get FCM token
      const { setupNotifications } = await import('@/lib/capacitor-firebase');
      const fcmToken = await setupNotifications();

      if (!fcmToken) {
        console.log('❌ No FCM token received');
        return;
      }

      console.log('✅ FCM token received:', fcmToken.substring(0, 30) + '...');

      // Save to database using the register function
      const { data, error } = await supabase.rpc('register_device_token', {
        p_user_id: userId,
        p_fcm_token: fcmToken,
        p_device_type: getDeviceType(),
        p_device_name: getDeviceName(),
        p_user_agent: navigator.userAgent
      });

      if (error) {
        console.error('❌ Failed to register device token:', error);
        return;
      }

      console.log('✅ Device token registered successfully');
      setIsRegistered(true);
      toast.success('Notifications enabled! 🔔');

    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-register when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId && !isRegistered && !isLoading) {
      registerForNotifications();
    }
  }, [isAuthenticated, userId]);

  return {
    isRegistered,
    isLoading,
    registerForNotifications
  };
};
