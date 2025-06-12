
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

// Unified location service for both web and native platforms
export const getCurrentLocation = async (): Promise<LocationPosition> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Native platform - use Capacitor Geolocation
      console.log('📍 Getting native location...');
      
      // Check permissions first
      const permissions = await Geolocation.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const permissionResult = await Geolocation.requestPermissions();
        if (permissionResult.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } else {
      // Web platform - use Web Geolocation API
      console.log('📍 Getting web location...');
      
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            reject(new Error(`Location error: ${error.message}`));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Error getting location:', error);
    throw error;
  }
};

// Watch position for real-time updates
export const watchLocation = (
  onUpdate: (position: LocationPosition) => void,
  onError: (error: string) => void
): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    // Native platform
    let watchId: string;
    
    const startWatch = async () => {
      try {
        watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000
          },
          (position, err) => {
            if (err) {
              onError(err.message);
              return;
            }
            
            if (position) {
              onUpdate({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            }
          }
        );
      } catch (error) {
        onError(error.message);
      }
    };
    
    startWatch();
    
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  } else {
    // Web platform
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        onError(`Location error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
    
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }
};
