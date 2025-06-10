
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

  // Check current permission status on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    const currentPermission = Notification.permission;
    console.log('🔔 Current permission status:', currentPermission);
    setHasPermission(currentPermission === 'granted');
  }, []);

  const initializeWithRetry = async (userId: string, userRole: 'customer' | 'merchant', attempt = 1) => {
    const maxRetries = 3;
    
    try {
      console.log(`🔔 Initializing notifications (attempt ${attempt}/${maxRetries}) for user:`, userId, userRole);
      
      const result = await initializeUserNotifications(userId, userRole);
      
      if (result.success) {
        setIsInitialized(true);
        setInitializationError(null);
        setRetryCount(0);
        console.log('✅ Notifications initialized successfully');
        
        // Setup foreground message handling
        setupForegroundMessaging((payload) => {
          console.log('📱 Foreground notification received:', payload);
          toast(payload.notification?.title || 'Notification', {
            description: payload.notification?.body,
            duration: 5000,
          });
        });
        
        return true;
      } else {
        console.error(`❌ Failed to initialize notifications (attempt ${attempt}):`, result.reason);
        
        // Retry for certain errors
        if (attempt < maxRetries && (result.reason === 'token_failed' || result.reason === 'save_failed')) {
          console.log(`🔄 Retrying initialization in 2 seconds... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await initializeWithRetry(userId, userRole, attempt + 1);
        } else {
          setInitializationError(result.reason || 'Unknown error');
          setRetryCount(attempt);
          setIsInitialized(false);
          return false;
        }
      }
    } catch (error) {
      console.error(`❌ Error initializing notifications (attempt ${attempt}):`, error);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying initialization in 2 seconds... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await initializeWithRetry(userId, userRole, attempt + 1);
      } else {
        setInitializationError(error.message || 'Initialization failed');
        setRetryCount(attempt);
        setIsInitialized(false);
        return false;
      }
    }
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !userId || !userRole) {
        console.log('🔔 Missing auth data:', { isAuthenticated, userId, userRole });
        return;
      }

      if (!hasPermission) {
        console.log('🔔 No notification permission granted');
        return;
      }

      if (isInitialized) {
        console.log('🔔 Already initialized');
        return;
      }

      await initializeWithRetry(userId, userRole);
    };

    // Only run if we have permission
    if (hasPermission && isAuthenticated && userId && userRole && !isInitialized) {
      initializeNotifications();
    }
  }, [isAuthenticated, userId, userRole, hasPermission, isInitialized]);

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
