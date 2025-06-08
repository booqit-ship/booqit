
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { Capacitor } from '@capacitor/core';

export const useOneSignal = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const initializedRef = useRef(false);
  const permissionRequestedRef = useRef(false);
  const userSetupCompleteRef = useRef(false);

  // Initialize OneSignal when the app loads
  useEffect(() => {
    if (initializedRef.current) return;
    
    const initializeOneSignal = async () => {
      try {
        console.log('🔔 Starting OneSignal initialization...');
        await oneSignalService.initialize();
        initializedRef.current = true;
        console.log('✅ OneSignal initialization complete');
        
        // For web, show permission prompts after initialization
        if (!Capacitor.isNativePlatform() && !permissionRequestedRef.current) {
          // Wait a bit for page to fully load
          setTimeout(async () => {
            console.log('🔔 Starting automatic permission flow for web...');
            permissionRequestedRef.current = true;
            
            try {
              // Check if already granted
              const isSubscribed = await oneSignalService.isSubscribed();
              if (!isSubscribed) {
                console.log('🔔 User not subscribed, showing permission prompts...');
                await oneSignalService.forcePermissionPrompt();
              } else {
                console.log('✅ User already subscribed to notifications');
              }
            } catch (error) {
              console.error('❌ Error in permission flow:', error);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Failed to initialize OneSignal:', error);
      }
    };

    // Start initialization immediately
    initializeOneSignal();
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    if (!initializedRef.current || !isAuthenticated || !userId || userSetupCompleteRef.current) return;

    const handleAuthChange = async () => {
      console.log('🔔 Setting up OneSignal for authenticated user:', userId, 'Role:', userRole);
      
      try {
        // Set user ID in OneSignal
        await oneSignalService.setUserId(userId);
        
        // Add role-based tags
        if (userRole) {
          await oneSignalService.addTag('userRole', userRole);
          await oneSignalService.addTag('user_type', userRole);
          await oneSignalService.addTag('last_login', new Date().toISOString());
        }
        
        // For merchants, be extra aggressive about notifications
        if (userRole === 'merchant') {
          await oneSignalService.addTag('merchant_id', userId);
          await oneSignalService.addTag('notification_priority', 'high');
          
          // For web merchants, really push for permission
          if (!Capacitor.isNativePlatform()) {
            const isSubscribed = await oneSignalService.isSubscribed();
            if (!isSubscribed) {
              console.log('🔔 Merchant not subscribed - showing permission prompts...');
              
              // Show multiple prompts with delays
              setTimeout(async () => {
                await oneSignalService.requestPermission();
              }, 1000);
              
              setTimeout(async () => {
                const stillNotSubscribed = !(await oneSignalService.isSubscribed());
                if (stillNotSubscribed) {
                  console.log('🔔 Merchant still not subscribed, trying slidedown...');
                  await oneSignalService.showSlidedownPrompt();
                }
              }, 3000);
              
              setTimeout(async () => {
                const stillNotSubscribed = !(await oneSignalService.isSubscribed());
                if (stillNotSubscribed) {
                  console.log('🔔 Merchant still not subscribed, trying native prompt...');
                  await oneSignalService.showNativePrompt();
                }
              }, 5000);
            }
          }
        }
        
        userSetupCompleteRef.current = true;
        console.log('✅ OneSignal setup complete for user');
      } catch (error) {
        console.error('❌ Error setting up OneSignal for user:', error);
      }
    };

    handleAuthChange();
  }, [isAuthenticated, userId, userRole]);

  const requestPermission = async (): Promise<boolean> => {
    permissionRequestedRef.current = true;
    return await oneSignalService.requestPermission();
  };

  const addTag = async (key: string, value: string): Promise<void> => {
    await oneSignalService.addTag(key, value);
  };

  const removeTag = async (key: string): Promise<void> => {
    await oneSignalService.removeTag(key);
  };

  const showPermissionPrompt = async (): Promise<void> => {
    await oneSignalService.showSlidedownPrompt();
  };

  const showNativePrompt = async (): Promise<void> => {
    await oneSignalService.showNativePrompt();
  };

  const forcePermissionPrompt = async (): Promise<void> => {
    await oneSignalService.forcePermissionPrompt();
  };

  const checkSubscriptionStatus = async (): Promise<boolean> => {
    return await oneSignalService.isSubscribed();
  };

  const getCurrentUserId = async (): Promise<string | null> => {
    return await oneSignalService.getCurrentUserId();
  };

  return {
    requestPermission,
    addTag,
    removeTag,
    showPermissionPrompt,
    showNativePrompt,
    forcePermissionPrompt,
    checkSubscriptionStatus,
    getCurrentUserId,
  };
};
