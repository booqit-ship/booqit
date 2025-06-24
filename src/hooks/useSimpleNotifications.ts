
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TokenCleanupService } from '@/services/TokenCleanupService';
import { Capacitor } from '@capacitor/core';

// Circuit breaker configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN = 30000; // 30 seconds
const REGISTRATION_TIMEOUT = 20000; // 20 seconds

export const useSimpleNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Circuit breaker state
  const retryAttempts = useRef(0);
  const lastRetryTime = useRef(0);
  const registrationInProgress = useRef(false);

  // Cross-device detection
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    return {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isAndroid: /Android/i.test(ua),
      isiOS: /iPhone|iPad|iPod/i.test(ua),
      isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
      userAgent: ua
    };
  };

  const getDeviceType = (): string => {
    const deviceInfo = getDeviceInfo();
    if (deviceInfo.isiOS) return 'ios';
    if (deviceInfo.isAndroid) return 'android';
    return 'web';
  };

  const getDeviceName = (): string => {
    const deviceInfo = getDeviceInfo();
    if (deviceInfo.isChrome) return 'Chrome Browser';
    if (/Firefox/i.test(deviceInfo.userAgent)) return 'Firefox Browser';
    if (/Safari/i.test(deviceInfo.userAgent)) return 'Safari Browser';
    if (/Edge/i.test(deviceInfo.userAgent)) return 'Edge Browser';
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
      console.log('🔍 SIMPLE NOTIFICATIONS: Registration check:', { hasTokens, tokenCount: data?.length || 0 });
      return hasTokens;
    } catch (error) {
      console.error('❌ Error in registration check:', error);
      return false;
    }
  };

  const canRetryRegistration = (): boolean => {
    const now = Date.now();
    
    if (retryAttempts.current >= MAX_RETRY_ATTEMPTS) {
      if (now - lastRetryTime.current > RETRY_COOLDOWN) {
        console.log('🔄 SIMPLE NOTIFICATIONS: Resetting retry attempts');
        retryAttempts.current = 0;
        lastRetryTime.current = 0;
        return true;
      }
      console.log('❌ SIMPLE NOTIFICATIONS: Max retry attempts reached');
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
      const deviceInfo = getDeviceInfo();
      console.log('🔔 SIMPLE NOTIFICATIONS: Starting registration for device:', deviceInfo);
      console.log('🔄 SIMPLE NOTIFICATIONS: Retry attempt:', retryAttempts.current + 1);

      // Clean up expired tokens first
      await TokenCleanupService.removeInvalidTokensForUser(userId);

      let fcmToken: string | null = null;

      if (deviceInfo.isNative) {
        // Use Capacitor for native platforms
        const { setupNotifications } = await import('@/lib/capacitor-firebase');
        fcmToken = await setupNotifications();
      } else {
        // Use direct Firebase Web SDK for web platforms
        const { setupNotifications } = await import('@/firebase');
        fcmToken = await setupNotifications();
      }

      if (!fcmToken) {
        console.log('❌ No FCM token received');
        throw new Error('Failed to get FCM token');
      }

      console.log('✅ FCM token received:', fcmToken.substring(0, 30) + '...');

      // Save to database
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
      
      // Device-specific success message
      const deviceName = deviceInfo.isNative ? 'native app' : 'browser';
      toast.success(`Notifications enabled on your ${deviceName}! 🔔`);

    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
      
      // Update circuit breaker
      retryAttempts.current++;
      lastRetryTime.current = Date.now();
      
      if (retryAttempts.current >= MAX_RETRY_ATTEMPTS) {
        toast.error('Failed to setup notifications. Please check your browser settings and try again later.');
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
      const timer = setTimeout(() => {
        registerForNotifications();
      }, 1500); // Reduced delay for better UX
      
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
