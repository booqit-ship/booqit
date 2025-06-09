
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

  // Check current permission status on mount and when auth changes
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    const currentPermission = Notification.permission;
    console.log('🔔 Current permission status:', currentPermission);
    setHasPermission(currentPermission === 'granted');
  }, [isAuthenticated]);

  // Initialize notifications when user is authenticated and has permission
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !userId || !userRole) {
        console.log('🔔 Missing auth data for initialization:', { isAuthenticated, userId, userRole });
        return;
      }

      if (!hasPermission) {
        console.log('🔔 No notification permission granted - skipping initialization');
        return;
      }

      if (isInitialized) {
        console.log('🔔 Already initialized - skipping');
        return;
      }

      console.log('🔔 Starting notification initialization for user:', userId, userRole);

      try {
        const result = await initializeUserNotifications(userId, userRole);
        
        if (result.success) {
          setIsInitialized(true);
          console.log('✅ Notifications initialized successfully');
          
          // Setup foreground message handling
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

    // Delay initialization slightly to ensure Firebase is ready
    if (hasPermission && isAuthenticated && userId && userRole) {
      setTimeout(initializeNotifications, 1000);
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
        
        // Wait a bit for permission to be fully processed
        setTimeout(async () => {
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
        }, 500);
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
