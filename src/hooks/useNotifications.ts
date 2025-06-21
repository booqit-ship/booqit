
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, setupForegroundMessaging } from '@/lib/capacitor-firebase';
import { RobustNotificationService } from '@/services/robustNotificationService';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use refs to prevent infinite loops
  const initializationAttempted = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const isInitializing = useRef(false);

  // Check permission status on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    setHasPermission(Notification.permission === 'granted');
  }, []);

  // Reset initialization when user changes
  useEffect(() => {
    if (lastUserId.current !== userId) {
      initializationAttempted.current = false;
      lastUserId.current = userId;
      setIsInitialized(false);
      setInitializationError(null);
      setRetryCount(0);
    }
  }, [userId]);

  // Auto-initialize FCM token for every login session (including new devices)
  useEffect(() => {
    const autoInitialize = async () => {
      // Prevent multiple simultaneous initializations
      if (isInitializing.current) {
        return;
      }

      console.log('🔔 NOTIFICATION HOOK: Auto-initialization triggered', { isAuthenticated, userId, userRole });
      
      if (!isAuthenticated || !userId || !userRole) {
        console.log('🔔 NOTIFICATION HOOK: Skipping - user not authenticated or missing data');
        return;
      }

      if (!('Notification' in window)) {
        console.log('❌ NOTIFICATION HOOK: Browser does not support notifications');
        setIsSupported(false);
        setInitializationError('not_supported');
        return;
      }

      // Mark as initializing to prevent loops
      isInitializing.current = true;

      try {
        setInitializationError(null);

        console.log('🔔 NOTIFICATION HOOK: Starting FCM token registration for user:', userId, 'role:', userRole);

        // Step 1: Request permission if not granted
        let permission = Notification.permission;
        console.log('📱 NOTIFICATION HOOK: Current permission status:', permission);

        if (permission === 'default') {
          console.log('📱 NOTIFICATION HOOK: Requesting notification permission...');
          const granted = await requestNotificationPermission();
          permission = granted ? 'granted' : 'denied';
          console.log('📱 NOTIFICATION HOOK: Permission response:', permission);
        }

        if (permission !== 'granted') {
          console.log('❌ NOTIFICATION HOOK: Permission not granted:', permission);
          setHasPermission(false);
          setInitializationError('permission_denied');
          return;
        }

        setHasPermission(true);
        console.log('✅ NOTIFICATION HOOK: Permission granted, getting FCM token...');

        // Step 2: Get FCM token with retry logic for new devices
        const { setupNotifications } = await import('@/lib/capacitor-firebase');
        
        let fcmToken = null;
        let attempts = 0;
        const maxAttempts = 3; // Increased attempts for new devices

        while (!fcmToken && attempts < maxAttempts) {
          attempts++;
          console.log(`🔑 NOTIFICATION HOOK: FCM token attempt ${attempts}/${maxAttempts}`);
          
          fcmToken = await setupNotifications();
          
          if (!fcmToken && attempts < maxAttempts) {
            console.log('⏳ NOTIFICATION HOOK: Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
          }
        }
        
        if (!fcmToken) {
          console.log('❌ NOTIFICATION HOOK: No FCM token received after all attempts');
          setInitializationError('token_failed');
          return;
        }

        console.log('🔑 NOTIFICATION HOOK: FCM token received, updating settings...');

        // Step 3: Always update FCM token (for new devices)
        const success = await RobustNotificationService.updateFCMToken(userId, fcmToken);
        
        if (success) {
          console.log('✅ NOTIFICATION HOOK: FCM token updated successfully');
          setIsInitialized(true);
          setInitializationError(null);
          setRetryCount(0);
          initializationAttempted.current = true;
          
          // Step 4: Setup foreground messaging handler
          setupForegroundMessaging((payload) => {
            console.log('📱 NOTIFICATION HOOK: Foreground notification received:', payload);
            toast(payload.notification?.title || 'Notification', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        } else {
          console.error('❌ NOTIFICATION HOOK: FCM token update failed');
          setInitializationError('initialization_failed');
        }
      } catch (error: any) {
        console.error('❌ NOTIFICATION HOOK: Error during auto-initialization:', error);
        setInitializationError(error?.message || String(error));
      } finally {
        isInitializing.current = false;
      }
    };

    // Always attempt initialization on new sessions
    autoInitialize();
  }, [isAuthenticated, userId, userRole]); // Remove initializationAttempted from dependencies

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
        console.log('🔔 MANUAL: Permission granted, getting FCM token...');
        
        const { setupNotifications } = await import('@/lib/capacitor-firebase');
        const fcmToken = await setupNotifications();
        
        if (fcmToken) {
          const success = await RobustNotificationService.updateFCMToken(userId, fcmToken);
          
          if (success) {
            setIsInitialized(true);
            setInitializationError(null);
            toast.success('Notifications enabled successfully! 🔔');
          } else {
            toast.error('Failed to initialize notifications');
          }
        } else {
          toast.error('Failed to get notification token');
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
    
    // Reset flags to allow retry
    initializationAttempted.current = false;
    isInitializing.current = false;
    setInitializationError(null);
    setIsInitialized(false);
    
    // Trigger re-initialization
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
    }, 100);
    
    return true;
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
