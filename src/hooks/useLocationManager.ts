
import { useState, useEffect, useCallback } from 'react';

const LOCATION_CACHE_KEY = 'user_location';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface LocationData {
  location: { lat: number; lng: number };
  locationName: string;
  timestamp: number;
}

export const useLocationManager = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Loading location...");

  const getCachedLocation = useCallback((): LocationData | null => {
    try {
      const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;
      
      const data: LocationData = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) return null;
      
      return data;
    } catch {
      return null;
    }
  }, []);

  const setCachedLocation = useCallback((location: { lat: number; lng: number }, name: string) => {
    try {
      const data: LocationData = {
        location,
        locationName: name,
        timestamp: Date.now()
      };
      sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache location:', error);
    }
  }, []);

  const fetchLocationName = useCallback(async (location: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.[0]) {
        const addressComponents = data.results[0].address_components;
        const neighborhood = addressComponents.find((component: any) => 
          component.types.includes('sublocality_level_1') || 
          component.types.includes('neighborhood')
        );
        const cityComponent = addressComponents.find((component: any) => 
          component.types.includes('locality') || 
          component.types.includes('administrative_area_level_1')
        );
        return neighborhood?.long_name || cityComponent?.long_name || "Your area";
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
    }
    return "Your area";
  }, []);

  useEffect(() => {
    const initializeLocation = async () => {
      // Check cache first
      const cached = getCachedLocation();
      if (cached) {
        setUserLocation(cached.location);
        setLocationName(cached.locationName);
        return;
      }

      // Get new location
      if (!navigator.geolocation) {
        const defaultLocation = { lat: 12.9716, lng: 77.5946 };
        setUserLocation(defaultLocation);
        setLocationName("Bengaluru");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);

          const name = await fetchLocationName(newLocation);
          setLocationName(name);
          setCachedLocation(newLocation, name);
        },
        (error) => {
          console.error("Error getting location:", error);
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setUserLocation(defaultLocation);
          setLocationName("Location unavailable");
        }
      );
    };

    initializeLocation();
  }, [getCachedLocation, setCachedLocation, fetchLocationName]);

  return { userLocation, locationName };
};
