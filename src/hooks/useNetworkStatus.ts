
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const checkNetworkStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
          console.log('📶 Network status:', status);
        } catch (error) {
          console.error('❌ Network status check failed:', error);
        }
      } else {
        // Web fallback
        setIsOnline(navigator.onLine);
        setConnectionType('unknown');
      }
    };

    checkNetworkStatus();

    if (Capacitor.isNativePlatform()) {
      const networkListener = Network.addListener('networkStatusChange', (status) => {
        console.log('📶 Network status changed:', status);
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });

      return () => {
        networkListener.remove();
      };
    } else {
      // Web event listeners
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return {
    isOnline,
    connectionType,
    isNative: Capacitor.isNativePlatform()
  };
};
