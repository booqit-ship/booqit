
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { Capacitor } from '@capacitor/core';

const getGeolocation = async () => {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    return Geolocation;
  }
  return null;
};

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
        
        // Request location permission on native platforms
        if (Capacitor.isNativePlatform()) {
          try {
            const Geolocation = await getGeolocation();
            if (Geolocation) {
              await Geolocation.getCurrentPosition();
              console.log('✅ Location permission granted');
            }
          } catch (error) {
            console.log('ℹ️ Location permission denied or unavailable:', error);
          }
        }
        
        initializedRef.current = true;
        console.log('✅ OneSignal initialization complete');
        
        // On web, automatically request notification permission after initialization
        if (!Capacitor.isNativePlatform() && !permissionRequestedRef.current) {
          setTimeout(async () => {
            console.log('🔔 Auto-requesting notification permission for web...');
            const granted = await oneSignalService.requestPermission();
            if (!granted) {
              // If permission denied, show slidedown prompt
              setTimeout(() => {
                oneSignalService.showSlidedownPrompt();
              }, 2000);
            }
            permissionRequestedRef.current = true;
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Failed to initialize OneSignal:', error);
      }
    };

    setTimeout(initializeOneSignal, 500);
  }, []);

  // Handle user authentication state changes with segmentation
  useEffect(() => {
    if (!initializedRef.current || !isAuthenticated || !userId) return;

    const handleAuthChange = async () => {
      console.log('🔔 Setting up OneSignal for authenticated user:', userId, 'Role:', userRole);
      
      await oneSignalService.setUserId(userId);
      
      if (userRole) {
        await oneSignalService.addTag('userRole', userRole);
        
        if (userRole === 'merchant') {
          await oneSignalService.addTag('user_type', 'merchant');
        } else if (userRole === 'customer') {
          await oneSignalService.addTag('user_type', 'customer');
        }
      }
      
      // For web users, ensure permission is requested after authentication
      if (!Capacitor.isNativePlatform() && !permissionRequestedRef.current) {
        setTimeout(async () => {
          console.log('🔔 Requesting permission for authenticated user...');
          const permission = await oneSignalService.requestPermission();
          if (!permission) {
            setTimeout(() => {
              oneSignalService.showSlidedownPrompt();
            }, 1000);
          }
          permissionRequestedRef.current = true;
        }, 1000);
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

  const setUserSegmentation = async (merchantId?: string): Promise<void> => {
    if (userId && userRole) {
      await oneSignalService.setUserSegmentation(userId, userRole, merchantId);
    }
  };

  const showPermissionPrompt = async (): Promise<void> => {
    await oneSignalService.showSlidedownPrompt();
  };

  const showNativePrompt = async (): Promise<void> => {
    await oneSignalService.showNativePrompt();
  };

  return {
    requestPermission,
    addTag,
    removeTag,
    setUserSegmentation,
    showPermissionPrompt,
    showNativePrompt,
  };
};
