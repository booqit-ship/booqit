
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TokenCleanupService } from '@/services/TokenCleanupService';

// Circuit breaker for failed registration attempts
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN = 60000; // 1 minute
const REGISTRATION_TIMEOUT = 30000; // 30 seconds

export const useSimpleNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Circuit breaker state
  const retryAttempts = useRef(0);
  const lastRetryTime = useRef(0);
  const registrationInProgress = useRef(false);

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

  const canRetryRegistration = (): boolean => {
    const now = Date.now();
    
    // Check if we've exceeded max retry attempts
    if (retryAttempts.current >= MAX_RETRY_ATTEMPTS) {
      // Reset attempts after cooldown period
      if (now - lastRetryTime.current > RETRY_COOLDOWN) {
        console.log('🔄 SIMPLE NOTIFICATIONS: Resetting retry attempts after cooldown');
        retryAttempts.current = 0;
        lastRetryTime.current = 0;
        return true;
      }
      console.log('❌ SIMPLE NOTIFICATIONS: Max retry attempts reached, waiting for cooldown');
      return false;
    }
    
    return true;
  };

  const registerForNotifications = async () => {
    if (!isAuthenticated || !userId || isLoading || registrationInProgress.current) {
      console.log('🔄 SIMPLE NOTIFICATIONS: Registration blocked', {
        isAuthenticated,
        hasUserId: !!userId,
        isLoading,
        registrationInProgress: registrationInProgress.current
      });
      return;
    }

    // Circuit breaker check
    if (!canRetryRegistration()) {
      console.log('🚫 SIMPLE NOTIFICATIONS: Registration blocked by circuit breaker');
      return;
    }

    registrationInProgress.current = true;
    setIsLoading(true);
    
    const registrationTimer = setTimeout(() => {
      console.log('⏰ SIMPLE NOTIFICATIONS: Registration timeout');
      registrationInProgress.current = false;
      setIsLoading(false);
    }, REGISTRATION_TIMEOUT);

    try {
      console.log('🔔 SIMPLE NOTIFICATIONS: Starting registration for user:', userId);
      console.log('🔄 SIMPLE NOTIFICATIONS: Retry attempt:', retryAttempts.current + 1);

      // Clean up expired tokens first
      await TokenCleanupService.removeInvalidTokensForUser(userId);

      // Check permission
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ Permission denied');
          toast.error('Please enable notifications to receive booking updates');
          throw new Error('Permission denied');
        }
      }

      // Get FCM token with enhanced error handling
      const { setupNotifications } = await import('@/lib/capacitor-firebase');
      const fcmToken = await setupNotifications();

      if (!fcmToken) {
        console.log('❌ No FCM token received');
        throw new Error('Failed to get FCM token');
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
        throw new Error(`Database registration failed: ${error.message}`);
      }

      console.log('✅ Device token registered successfully:', data);
      
      // Reset circuit breaker on success
      retryAttempts.current = 0;
      lastRetryTime.current = 0;
      
      setIsRegistered(true);
      toast.success('Notifications enabled! 🔔');

    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
      
      // Update circuit breaker
      retryAttempts.current++;
      lastRetryTime.current = Date.now();
      
      if (retryAttempts.current >= MAX_RETRY_ATTEMPTS) {
        toast.error('Failed to setup notifications. Please try again later.');
        console.log('🚫 SIMPLE NOTIFICATIONS: Max retry attempts reached');
      } else {
        toast.error('Failed to setup notifications. Retrying...');
        console.log(`🔄 SIMPLE NOTIFICATIONS: Will retry (${retryAttempts.current}/${MAX_RETRY_ATTEMPTS})`);
      }
    } finally {
      clearTimeout(registrationTimer);
      registrationInProgress.current = false;
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
    if (isAuthenticated && userId && !isRegistered && !isLoading && !registrationInProgress.current) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        registerForNotifications();
      }, 2000); // Increased delay to prevent race conditions
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userId, isRegistered, isLoading]);

  return {
    isRegistered,
    isLoading,
    registerForNotifications,
    retryAttempts: retryAttempts.current,
    canRetry: canRetryRegistration()
  };
};
