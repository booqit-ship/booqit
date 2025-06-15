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

  // On login, always try to initialize and save FCM token
  useEffect(() => {
    const tryInit = async () => {
      if (!isAuthenticated || !userId || !userRole) return;

      // If not granted, request and register
      if (!('Notification' in window)) {
        setIsSupported(false);
        setInitializationError('not_supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        try {
          const result = await Notification.requestPermission();
          setHasPermission(result === 'granted');
        } catch (err: any) {
          setInitializationError(err?.message || String(err));
          setHasPermission(false);
          return;
        }
      }

      if (Notification.permission === 'granted') {
        setHasPermission(true);
        // Try to register/save FCM token anyway
        try {
          setIsInitialized(false);
          setInitializationError(null);
          setRetryCount(0);

          // Force an FCM registration and save, robust to failure
          const { initializeUserNotifications } = await import("@/services/notificationService");
          const result = await initializeUserNotifications(userId, userRole);
          if (result?.success) {
            setIsInitialized(true);
            setInitializationError(null);
            setRetryCount(0);
            // Setup foreground handler
            import('@/firebase').then(({ setupForegroundMessaging }) => {
              setupForegroundMessaging((payload) => {
                console.log('📱 Foreground notification received:', payload);
                import('sonner').then(({ toast }) => {
                  toast(payload.notification?.title || 'Notification', {
                    description: payload.notification?.body,
                    duration: 5000,
                  });
                });
              });
            });
          } else {
            setIsInitialized(false);
            setInitializationError(result?.reason || 'Unknown error');
          }
        } catch (error: any) {
          setInitializationError(error?.message || String(error));
          setIsInitialized(false);
        }
      }
    };
    tryInit();
    // Only once after login/role selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, userRole]); // Only runs when user logs in or changes role

  const requestPermissionManually = async () => {
    try {
      if (!isSupported) {
        toast.error('Notifications are not supported in this browser');
        return false;
      }

      console.log('🔔 Requesting notification permission manually...');
      const permission = await requestNotificationPermission();
      setHasPermission(permission);
      
      if (permission && userId && userRole) {
        console.log('🔔 Permission granted, initializing notifications...');
        const success = await initializeWithRetry(userId, userRole);
        
        if (success) {
          toast.success('Notifications enabled successfully! 🔔');
        } else {
          toast.error(`Failed to initialize notifications: ${initializationError}`);
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
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      toast.error('Failed to enable notifications: ' + error.message);
      return false;
    }
  };

  const retryInitialization = async () => {
    if (!userId || !userRole) {
      toast.error('User not authenticated');
      return false;
    }

    setInitializationError(null);
    const success = await initializeWithRetry(userId, userRole);
    
    if (success) {
      toast.success('Notifications initialized successfully! 🔔');
    } else {
      toast.error(`Failed to initialize notifications: ${initializationError}`);
    }
    
    return success;
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
