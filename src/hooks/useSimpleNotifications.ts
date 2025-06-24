
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TokenCleanupService } from '@/services/TokenCleanupService';

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

  const checkExistingRegistration = async () => {
    if (!isAuthenticated || !userId) return false;

    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('❌ Error checking existing registration:', error);
        return false;
      }

      const hasTokens = data && data.length > 0;
      console.log('🔍 SIMPLE NOTIFICATIONS: Existing registration check:', { hasTokens, tokenCount: data?.length || 0 });
      return hasTokens;
    } catch (error) {
      console.error('❌ Error in registration check:', error);
      return false;
    }
  };

  const registerForNotifications = async () => {
    if (!isAuthenticated || !userId || isLoading) return;

    setIsLoading(true);
    try {
      console.log('🔔 SIMPLE NOTIFICATIONS: Starting registration for user:', userId);

      // Clean up expired tokens first
      await TokenCleanupService.removeInvalidTokensForUser(userId);

      // Check permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ Permission denied');
          toast.error('Please enable notifications to receive booking updates');
          return;
        }
      }

      // Get FCM token
      const { setupNotifications } = await import('@/lib/capacitor-firebase');
      const fcmToken = await setupNotifications();

      if (!fcmToken) {
        console.log('❌ No FCM token received');
        toast.error('Failed to setup notifications. Please try again.');
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
        toast.error('Failed to register for notifications. Please try again.');
        return;
      }

      console.log('✅ Device token registered successfully:', data);
      setIsRegistered(true);
      toast.success('Notifications enabled! 🔔');

    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
      toast.error('Failed to setup notifications. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check existing registration on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      checkExistingRegistration().then(setIsRegistered);
    } else {
      setIsRegistered(false);
    }
  }, [isAuthenticated, userId]);

  // Auto-register when user is authenticated and not already registered
  useEffect(() => {
    if (isAuthenticated && userId && !isRegistered && !isLoading) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        registerForNotifications();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userId, isRegistered, isLoading]);

  return {
    isRegistered,
    isLoading,
    registerForNotifications
  };
};
