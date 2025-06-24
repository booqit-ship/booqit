
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MultiDeviceNotificationService, DeviceToken } from '@/services/multiDeviceNotificationService';
import { setupNotifications } from '@/lib/capacitor-firebase';
import { toast } from 'sonner';

export const useMultiDeviceNotifications = () => {
  const { isAuthenticated, userId } = useAuth();
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentDeviceToken, setCurrentDeviceToken] = useState<string | null>(null);

  // Load user's device tokens
  useEffect(() => {
    const loadDeviceTokens = async () => {
      if (!isAuthenticated || !userId) return;

      try {
        const tokens = await MultiDeviceNotificationService.getUserDeviceTokens();
        setDeviceTokens(tokens);
      } catch (error) {
        console.error('❌ Error loading device tokens:', error);
      }
    };

    loadDeviceTokens();
  }, [isAuthenticated, userId]);

  // Register current device
  const registerCurrentDevice = async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) return false;

    setIsRegistering(true);
    try {
      console.log('📱 MULTI-DEVICE HOOK: Registering current device...');

      // Get FCM token for current device
      const fcmToken = await setupNotifications();
      if (!fcmToken) {
        toast.error('Failed to get notification token');
        return false;
      }

      const deviceType = MultiDeviceNotificationService.getDeviceType();
      const deviceName = MultiDeviceNotificationService.getDeviceName();

      const success = await MultiDeviceNotificationService.registerDeviceToken(
        fcmToken,
        deviceType,
        deviceName
      );

      if (success) {
        setCurrentDeviceToken(fcmToken);
        toast.success('Device registered for notifications! 🔔');
        
        // Reload device tokens
        const tokens = await MultiDeviceNotificationService.getUserDeviceTokens();
        setDeviceTokens(tokens);
        
        return true;
      } else {
        toast.error('Failed to register device');
        return false;
      }
    } catch (error) {
      console.error('❌ MULTI-DEVICE HOOK: Error registering device:', error);
      toast.error('Failed to register device');
      return false;
    } finally {
      setIsRegistering(false);
    }
  };

  // Remove a device token
  const removeDevice = async (fcmToken: string): Promise<boolean> => {
    try {
      const success = await MultiDeviceNotificationService.removeDeviceToken(fcmToken);
      
      if (success) {
        toast.success('Device removed successfully');
        
        // Reload device tokens
        const tokens = await MultiDeviceNotificationService.getUserDeviceTokens();
        setDeviceTokens(tokens);
        
        // Clear current device token if it was removed
        if (currentDeviceToken === fcmToken) {
          setCurrentDeviceToken(null);
        }
        
        return true;
      } else {
        toast.error('Failed to remove device');
        return false;
      }
    } catch (error) {
      console.error('❌ MULTI-DEVICE HOOK: Error removing device:', error);
      toast.error('Failed to remove device');
      return false;
    }
  };

  // Update current device usage
  const updateCurrentDeviceUsage = async () => {
    if (currentDeviceToken) {
      await MultiDeviceNotificationService.updateTokenLastUsed(currentDeviceToken);
    }
  };

  return {
    deviceTokens,
    currentDeviceToken,
    isRegistering,
    registerCurrentDevice,
    removeDevice,
    updateCurrentDeviceUsage
  };
};
