
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedNotificationService } from '@/services/UnifiedNotificationService';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export const useUnifiedNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerForNotifications = async () => {
    if (!isAuthenticated || !userId || isLoading) {
      console.log('🔔 UNIFIED HOOK: Registration blocked - not authenticated or already loading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔔 UNIFIED HOOK: Starting notification registration');
      
      // Initialize notifications and get token
      const fcmToken = await UnifiedNotificationService.initialize();
      
      if (!fcmToken) {
        throw new Error('Failed to get FCM token');
      }

      // Register token with Supabase
      const success = await UnifiedNotificationService.registerToken(userId, fcmToken);
      
      if (success) {
        setIsRegistered(true);
        const platform = Capacitor.isNativePlatform() ? 'native app' : 'browser';
        toast.success(`Notifications enabled on your ${platform}! 🔔`);
        console.log('✅ UNIFIED HOOK: Registration successful');
      } else {
        throw new Error('Failed to register token with server');
      }
    } catch (error: any) {
      console.error('❌ UNIFIED HOOK: Registration failed:', error);
      setError(error.message || 'Registration failed');
      toast.error('Failed to setup notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!userId) {
      toast.error('Please log in to send test notifications');
      return;
    }

    return await UnifiedNotificationService.sendTestNotification(userId);
  };

  // Setup native listeners on mount
  useEffect(() => {
    UnifiedNotificationService.setupNativeListeners();
  }, []);

  // Auto-register when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId && !isRegistered && !isLoading && !error) {
      const timer = setTimeout(() => {
        registerForNotifications();
      }, 2000); // Wait 2 seconds after auth

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userId, isRegistered, isLoading, error]);

  return {
    isRegistered,
    isLoading,
    error,
    registerForNotifications,
    sendTestNotification
  };
};
