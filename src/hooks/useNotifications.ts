
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, setupForegroundMessaging } from '@/firebase';
import { initializeUserNotifications } from '@/services/notificationService';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !userId || !userRole || isInitialized) {
        return;
      }

      console.log('🔔 Setting up notifications for user:', userId, userRole);

      try {
        // Request permission
        const permission = await requestNotificationPermission();
        setHasPermission(permission);

        if (permission) {
          // Initialize user notifications (save token and send welcome)
          const initialized = await initializeUserNotifications(userId, userRole);
          
          if (initialized) {
            setIsInitialized(true);
            console.log('✅ Notifications initialized successfully');
            
            // Setup foreground message handling
            setupForegroundMessaging((payload) => {
              toast(payload.notification?.title || 'Notification', {
                description: payload.notification?.body,
                duration: 5000,
              });
            });
          } else {
            console.log('❌ Failed to initialize notifications');
          }
        } else {
          console.log('❌ Notification permission not granted');
          toast.error('Notification permission required for booking updates');
        }
      } catch (error) {
        console.error('❌ Error setting up notifications:', error);
      }
    };

    // Delay initialization to ensure auth is fully loaded
    const timer = setTimeout(initializeNotifications, 2000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, userId, userRole, isInitialized]);

  const requestPermissionManually = async () => {
    try {
      const permission = await requestNotificationPermission();
      setHasPermission(permission);
      
      if (permission && userId && userRole) {
        const initialized = await initializeUserNotifications(userId, userRole);
        setIsInitialized(initialized);
        
        if (initialized) {
          toast.success('Notifications enabled successfully! 🔔');
        }
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  };

  return {
    isInitialized,
    hasPermission,
    requestPermissionManually
  };
};
