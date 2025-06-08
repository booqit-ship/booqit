
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { toast } from 'sonner';

export const useOneSignal = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const initializedRef = useRef(false);
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
      } catch (error) {
        console.error('❌ Failed to initialize OneSignal:', error);
      }
    };

    initializeOneSignal();
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    if (!initializedRef.current || !isAuthenticated || !userId || userSetupCompleteRef.current) return;

    const handleAuthChange = async () => {
      console.log('🔔 Setting up OneSignal for authenticated user:', userId, 'Role:', userRole);
      
      try {
        // Set external user ID
        await oneSignalService.setUserId(userId);
        
        // Add role-based tags
        if (userRole) {
          await oneSignalService.addTag('userRole', userRole);
          await oneSignalService.addTag('user_type', userRole);
          await oneSignalService.addTag('last_login', new Date().toISOString());
        }
        
        // For merchants, be aggressive about notifications
        if (userRole === 'merchant') {
          console.log('🏪 Setting up merchant-specific notifications...');
          
          await oneSignalService.addTag('merchant_id', userId);
          await oneSignalService.addTag('notification_priority', 'high');
          await oneSignalService.addTag('business_notifications', 'enabled');
          
          // Get current subscription status
          const isSubscribed = await oneSignalService.isSubscribed();
          console.log('🔔 Merchant subscription status:', isSubscribed);
          
          if (!isSubscribed) {
            console.log('🔔 Merchant not subscribed - requesting permission...');
            
            toast.info('📱 Enable notifications to receive booking alerts!', {
              duration: 8000,
            });
            
            // Try to get permission
            setTimeout(async () => {
              const hasPermission = await oneSignalService.requestPermission();
              
              if (hasPermission) {
                toast.success('✅ Booking notifications enabled!');
              } else {
                toast.error('❌ Notifications disabled. You may miss booking alerts.');
              }
            }, 2000);
          } else {
            console.log('✅ Merchant already subscribed to notifications');
            toast.success('✅ Booking notifications are active!');
          }
        }
        
        userSetupCompleteRef.current = true;
        console.log('✅ OneSignal setup complete for user');
        
      } catch (error) {
        console.error('❌ Error setting up OneSignal for user:', error);
        toast.error('Failed to setup notifications. Try refreshing the page.');
      }
    };

    handleAuthChange();
  }, [isAuthenticated, userId, userRole]);

  const requestPermission = async (): Promise<boolean> => {
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

  const getSubscriptionDetails = async (): Promise<any> => {
    return await oneSignalService.getSubscriptionDetails();
  };

  const resetAndSetupUser = async (): Promise<void> => {
    if (!userId) {
      console.error('❌ No user ID available for reset');
      return;
    }

    try {
      console.log('🔔 Resetting and setting up OneSignal user...');
      userSetupCompleteRef.current = false;
      
      await oneSignalService.setUserId(userId);
      
      if (userRole) {
        await oneSignalService.addTag('userRole', userRole);
        await oneSignalService.addTag('user_type', userRole);
        await oneSignalService.addTag('last_setup', new Date().toISOString());
        
        if (userRole === 'merchant') {
          await oneSignalService.addTag('merchant_id', userId);
          await oneSignalService.addTag('notification_priority', 'high');
        }
      }
      
      userSetupCompleteRef.current = true;
      console.log('✅ OneSignal user reset and setup complete');
      
      toast.success('OneSignal user setup refreshed!');
    } catch (error) {
      console.error('❌ Error resetting OneSignal user:', error);
      toast.error('Failed to reset OneSignal setup');
    }
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
    getSubscriptionDetails,
    resetAndSetupUser,
  };
};
