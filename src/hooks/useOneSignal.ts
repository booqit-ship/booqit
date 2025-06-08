
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { oneSignalService } from '@/services/oneSignalService';
import { Capacitor } from '@capacitor/core';

// Dynamically import geolocation to avoid build issues on web
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
      } catch (error) {
        console.error('❌ Failed to initialize OneSignal:', error);
      }
    };

    // Delay initialization slightly to ensure DOM is ready
    setTimeout(initializeOneSignal, 500);
  }, []);

  // Handle user authentication state changes with segmentation
  useEffect(() => {
    if (!initializedRef.current) return;

    const handleAuthChange = async () => {
      if (isAuthenticated && userId) {
        console.log('🔔 Setting up OneSignal for authenticated user:', userId, 'Role:', userRole);
        
        // Set user ID and segmentation in OneSignal
        await oneSignalService.setUserId(userId);
        
        // Add user role and segmentation tags
        if (userRole) {
          await oneSignalService.addTag('userRole', userRole);
          
          // For merchants, we might want to add merchant-specific data
          if (userRole === 'merchant') {
            await oneSignalService.addTag('user_type', 'merchant');
          } else if (userRole === 'customer') {
            await oneSignalService.addTag('user_type', 'customer');
          }
        }
        
        // Request notification permission after user is authenticated
        setTimeout(async () => {
          const permission = await oneSignalService.requestPermission();
          if (permission) {
            console.log('✅ Push notification permission granted');
          } else {
            console.log('ℹ️ Push notification permission denied');
          }
        }, 1000);
      } else {
        console.log('🔔 Logging out OneSignal user');
        await oneSignalService.logout();
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

  const setUserSegmentation = async (merchantId?: string): Promise<void> => {
    if (userId && userRole) {
      await oneSignalService.setUserSegmentation(userId, userRole, merchantId);
    }
  };

  const showPermissionPrompt = async (): Promise<void> => {
    await oneSignalService.showPermissionPrompt();
  };

  return {
    requestPermission,
    addTag,
    removeTag,
    setUserSegmentation,
    showPermissionPrompt,
  };
};
