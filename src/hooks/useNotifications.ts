
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, setupForegroundMessaging } from '@/firebase';
import { initializeUserNotifications } from '@/services/notificationService';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check permission status on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    setHasPermission(Notification.permission === 'granted');
  }, []);

  // CRITICAL: Auto-initialize FCM token on every login/role change
  useEffect(() => {
    const autoInitialize = async () => {
      console.log('🔔 NOTIFICATION HOOK: Auto-initialization triggered', { isAuthenticated, userId, userRole });
      
      if (!isAuthenticated || !userId || !userRole) {
        console.log('🔔 NOTIFICATION HOOK: Skipping - user not authenticated or missing data');
        setIsInitialized(false);
        return;
      }

      if (!('Notification' in window)) {
        console.log('❌ NOTIFICATION HOOK: Browser does not support notifications');
        setIsSupported(false);
        setInitializationError('not_supported');
        return;
      }

      try {
        setIsInitialized(false);
        setInitializationError(null);
        setRetryCount(0);

        console.log('🔔 NOTIFICATION HOOK: Starting FCM token registration for user:', userId, 'role:', userRole);

        // Step 1: Request permission if not granted
        let permission = Notification.permission;
        console.log('📱 NOTIFICATION HOOK: Current permission status:', permission);

        if (permission === 'default') {
          console.log('📱 NOTIFICATION HOOK: Requesting notification permission...');
          permission = await Notification.requestPermission();
          console.log('📱 NOTIFICATION HOOK: Permission response:', permission);
        }

        if (permission !== 'granted') {
          console.log('❌ NOTIFICATION HOOK: Permission not granted:', permission);
          setHasPermission(false);
          setInitializationError('permission_denied');
          return;
        }

        setHasPermission(true);
        console.log('✅ NOTIFICATION HOOK: Permission granted, initializing notifications...');

        // Step 2: Initialize and save FCM token
        const result = await initializeUserNotifications(userId, userRole);
        
        if (result?.success) {
          console.log('✅ NOTIFICATION HOOK: FCM token registration successful');
          setIsInitialized(true);
          setInitializationError(null);
          setRetryCount(0);
          
          // Step 3: Setup foreground messaging handler
          setupForegroundMessaging((payload) => {
            console.log('📱 NOTIFICATION HOOK: Foreground notification received:', payload);
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          console.error('❌ NOTIFICATION HOOK: FCM token registration failed:', result);
          setIsInitialized(false);
          setInitializationError(result?.reason || 'Unknown error');
          
          // Auto-retry for certain types of failures
          if (result?.reason === 'token_failed' && retryCount < 2) {
            console.log('🔄 NOTIFICATION HOOK: Retrying FCM token registration in 2 seconds...');
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
        }
      } catch (error: any) {
        console.error('❌ NOTIFICATION HOOK: Error during auto-initialization:', error);
        setInitializationError(error?.message || String(error));
        setIsInitialized(false);
      }
    };

    // Run auto-initialization when user logs in or role changes
    autoInitialize();
  }, [isAuthenticated, userId, userRole, retryCount]);

  const requestPermissionManually = async () => {
    try {
      if (!isSupported) {
        toast.error('Notifications are not supported in this browser');
        return false;
      }

      console.log('🔔 MANUAL: Requesting notification permission manually...');
      const permission = await requestNotificationPermission();
      setHasPermission(permission);

      if (permission && userId && userRole) {
        console.log('🔔 MANUAL: Permission granted, initializing notifications...');
        const result = await initializeUserNotifications(userId, userRole);

        if (result?.success) {
          setIsInitialized(true);
          setInitializationError(null);
          toast.success('Notifications enabled successfully! 🔔');
        } else {
          toast.error(`Failed to initialize notifications: ${result?.reason || initializationError}`);
        }
      } else {
        toast('To get booking updates, please enable notifications in your browser settings', {
          duration: 7000,
          action: {
            label: 'Learn How',
            onClick: () => {
              window.open('https://support.google.com/chrome/answer/3220216', '_blank');
            }
          }
        });
      }

      return permission;
    } catch (error: any) {
      console.error('❌ MANUAL: Error requesting permission:', error);
      toast.error('Failed to enable notifications: ' + error.message);
      return false;
    }
  };

  const retryInitialization = async () => {
    if (!userId || !userRole) {
      toast.error('User not authenticated');
      return false;
    }

    console.log('🔄 RETRY: Retrying notification initialization...');
    setInitializationError(null);
    
    const result = await initializeUserNotifications(userId, userRole);

    if (result?.success) {
      setIsInitialized(true);
      setInitializationError(null);
      toast.success('Notifications initialized successfully! 🔔');
    } else {
      toast.error(`Failed to initialize notifications: ${result?.reason || initializationError}`);
    }

    return result?.success || false;
  };

  return {
    isInitialized,
    hasPermission,
    isSupported,
    initializationError,
    retryCount,
    requestPermissionManually,
    retryInitialization
  };
};
