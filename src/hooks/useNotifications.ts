
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, setupForegroundMessaging, getFCMToken } from '@/firebase';
import { initializeUserNotifications, saveUserFCMToken } from '@/services/notificationService';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

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

  // Initialize notifications for authenticated users
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

      console.log('🔔 Initializing notifications for user:', userId, userRole);

      try {
        const result = await initializeUserNotifications(userId, userRole);
        
        if (result.success) {
          setIsInitialized(true);
          console.log('✅ Notifications initialized successfully');
          
          // Setup foreground message handling globally
          setupForegroundMessaging((payload) => {
            console.log('📱 Foreground notification received:', payload);
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          console.error('❌ Failed to initialize notifications:', result.reason);
          setIsInitialized(false);
        }
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
        setIsInitialized(false);
      }
    };

    if (hasPermission && isAuthenticated && userId && userRole) {
      initializeNotifications();
    }
  }, [isAuthenticated, userId, userRole, hasPermission, isInitialized]);

  // FCM Token refresh logic - runs every 30 minutes for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !userId || !userRole || !hasPermission) {
      return;
    }

    let refreshInterval: NodeJS.Timeout;

    const refreshFCMToken = async () => {
      try {
        console.log('🔄 Refreshing FCM token...');
        const token = await getFCMToken();
        
        if (token) {
          const saved = await saveUserFCMToken(userId, token, userRole);
          if (saved) {
            console.log('✅ FCM token refreshed and saved successfully');
          } else {
            console.error('❌ Failed to save refreshed FCM token');
          }
        } else {
          console.error('❌ Failed to get FCM token during refresh');
        }
      } catch (error) {
        console.error('❌ Error refreshing FCM token:', error);
      }
    };

    // Initial refresh
    refreshFCMToken();
    
    // Set up interval for token refresh every 30 minutes
    refreshInterval = setInterval(refreshFCMToken, 30 * 60 * 1000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, userId, userRole, hasPermission]);

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
        const result = await initializeUserNotifications(userId, userRole);
        
        if (result.success) {
          setIsInitialized(true);
          toast.success('Notifications enabled successfully! 🔔');
          
          // Setup foreground message handling
          setupForegroundMessaging((payload) => {
            console.log('📱 Foreground notification received:', payload);
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          console.error('❌ Failed to initialize after permission grant:', result.reason);
          toast.error('Failed to initialize notifications: ' + result.reason);
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

  return {
    isInitialized,
    hasPermission,
    isSupported,
    requestPermissionManually
  };
};
