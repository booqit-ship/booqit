
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { Capacitor } from '@capacitor/core';

export const useOneSignal = () => {
  const { isAuthenticated, userId, userRole } = useAuth();
  const initializedRef = useRef(false);
  const permissionRequestedRef = useRef(false);

  // Initialize OneSignal when the app loads
  useEffect(() => {
    if (initializedRef.current) return;
    
    const initializeOneSignal = async () => {
      try {
        console.log('🔔 Starting OneSignal initialization...');
        await oneSignalService.initialize();
        initializedRef.current = true;
        console.log('✅ OneSignal initialization complete');
        
        // For web, auto-request permission after a short delay
        if (!Capacitor.isNativePlatform() && !permissionRequestedRef.current) {
          setTimeout(async () => {
            console.log('🔔 Auto-requesting notification permission for web...');
            const granted = await oneSignalService.requestPermission();
            permissionRequestedRef.current = true;
            
            if (!granted) {
              console.log('❌ Permission not granted, will show prompt when user authenticates');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Failed to initialize OneSignal:', error);
      }
    };

    // Start initialization after a short delay
    setTimeout(initializeOneSignal, 500);
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    if (!initializedRef.current || !isAuthenticated || !userId) return;

    const handleAuthChange = async () => {
      console.log('🔔 Setting up OneSignal for authenticated user:', userId, 'Role:', userRole);
      
      try {
        // Set user ID in OneSignal
        await oneSignalService.setUserId(userId);
        
        // Add role-based tags
        if (userRole) {
          await oneSignalService.addTag('userRole', userRole);
          await oneSignalService.addTag('user_type', userRole);
        }
        
        // For merchants, ensure notifications are enabled
        if (userRole === 'merchant') {
          await oneSignalService.addTag('merchant_id', userId);
          
          // For web merchants, aggressively request permission
          if (!Capacitor.isNativePlatform()) {
            setTimeout(async () => {
              console.log('🔔 Requesting permission for merchant user...');
              const granted = await oneSignalService.requestPermission();
              
              if (!granted) {
                // Show slidedown as fallback
                setTimeout(async () => {
                  console.log('🔔 Showing slidedown as fallback for merchant...');
                  await oneSignalService.showSlidedownPrompt();
                }, 1000);
              }
            }, 1000);
          }
        }
        
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

  return {
    requestPermission,
    addTag,
    removeTag,
    showPermissionPrompt,
    showNativePrompt,
    forcePermissionPrompt,
  };
};
