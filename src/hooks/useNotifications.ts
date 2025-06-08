
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

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !userId || !userRole || isInitialized) {
        return;
      }

      console.log('🔔 Setting up notifications for user:', userId, userRole);

      try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
          console.log('❌ Notifications not supported in this browser');
          setIsSupported(false);
          return;
        }

        // Check current permission status
        const currentPermission = Notification.permission;
        console.log('📱 Current permission status:', currentPermission);

        if (currentPermission === 'granted') {
          setHasPermission(true);
          
          // Initialize notifications since we already have permission
          const result = await initializeUserNotifications(userId, userRole);
          
          if (result.success) {
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
            console.log('❌ Failed to initialize notifications:', result.reason);
          }
        } else if (currentPermission === 'denied') {
          console.log('❌ Notification permission denied by user');
          setHasPermission(false);
        } else {
          // Permission is 'default' - hasn't been asked yet
          console.log('📱 Notification permission not requested yet');
          setHasPermission(false);
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
      if (!isSupported) {
        toast.error('Notifications are not supported in this browser');
        return false;
      }

      const permission = await requestNotificationPermission();
      setHasPermission(permission);
      
      if (permission && userId && userRole) {
        const result = await initializeUserNotifications(userId, userRole);
        
        if (result.success) {
          setIsInitialized(true);
          toast.success('Notifications enabled successfully! 🔔');
          
          // Setup foreground message handling
          setupForegroundMessaging((payload) => {
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          toast.error('Failed to initialize notifications');
        }
      } else {
        toast('To get booking updates, please enable notifications in your browser settings', {
          duration: 7000,
          action: {
            label: 'Learn How',
            onClick: () => {
              // You could open a help modal or link here
              window.open('https://support.google.com/chrome/answer/3220216', '_blank');
            }
          }
        });
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
    isSupported,
    requestPermissionManually
  };
};
