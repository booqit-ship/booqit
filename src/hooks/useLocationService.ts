
import { useState, useEffect, useCallback, useRef } from 'react';
import { locationService, LocationResult } from '@/services/LocationService';

interface UseLocationServiceOptions {
  autoStart?: boolean;
  onPermissionDenied?: () => void;
}

export const useLocationService = (options: UseLocationServiceOptions = {}) => {
  const { autoStart = false, onPermissionDenied } = options;
  
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasHighAccuracy, setHasHighAccuracy] = useState(false);
  
  const isStartedRef = useRef(false);

  const startLocationFetching = useCallback(async () => {
    if (isStartedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    setPermissionDenied(false);
    isStartedRef.current = true;

    await locationService.startLocationFetching({
      onLocationUpdate: (newLocation) => {
        setLocation(newLocation);
        setHasHighAccuracy(newLocation.isHighAccuracy);
        if (newLocation.isHighAccuracy) {
          setIsLoading(false);
        }
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false);
      },
      onPermissionDenied: () => {
        setPermissionDenied(true);
        setIsLoading(false);
        onPermissionDenied?.();
      }
    });
  }, [onPermissionDenied]);

  const stopLocationTracking = useCallback(() => {
    locationService.stopLocationTracking();
    isStartedRef.current = false;
    setIsLoading(false);
  }, []);

  const retryLocationFetch = useCallback(() => {
    isStartedRef.current = false;
    startLocationFetching();
  }, [startLocationFetching]);

  useEffect(() => {
    if (autoStart) {
      startLocationFetching();
    }

    return () => {
      stopLocationTracking();
    };
  }, [autoStart, startLocationFetching, stopLocationTracking]);

  return {
    location,
    isLoading,
    error,
    permissionDenied,
    hasHighAccuracy,
    startLocationFetching,
    stopLocationTracking,
    retryLocationFetch
  };
};
