
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';

const CACHE_KEY = 'nearby_merchants';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  merchants: Merchant[];
  timestamp: number;
  location: { lat: number; lng: number };
}

export const useOptimizedMerchants = (userLocation: { lat: number; lng: number } | null) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getCachedData = useCallback((): CachedData | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      if (now - data.timestamp > CACHE_DURATION) return null;
      
      // Check if location is similar (within 1km)
      if (userLocation && data.location) {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          data.location.lat, data.location.lng
        );
        if (distance > 1) return null; // Location changed significantly
      }
      
      return data;
    } catch {
      return null;
    }
  }, [userLocation]);

  const setCachedData = useCallback((merchants: Merchant[], location: { lat: number; lng: number }) => {
    try {
      const data: CachedData = {
        merchants,
        timestamp: Date.now(),
        location
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache merchants data:', error);
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const fetchMerchants = useCallback(async (location: { lat: number; lng: number }) => {
    try {
      // Check cache first
      const cached = getCachedData();
      if (cached) {
        setMerchants(cached.merchants);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Optimized query - limit to 20 closest merchants
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        // Calculate distances and filter
        const merchantsWithDistance = data
          .map(merchant => {
            const distance = calculateDistance(
              location.lat, location.lng,
              merchant.lat, merchant.lng
            );
            return {
              ...merchant,
              distance: `${distance.toFixed(1)} km`,
              distanceValue: distance
            } as Merchant;
          })
          .filter(merchant => (merchant.distanceValue || 0) <= 5)
          .sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0))
          .slice(0, 12); // Limit to 12 for performance

        setMerchants(merchantsWithDistance);
        setCachedData(merchantsWithDistance, location);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast({
        title: "Error",
        description: "Failed to load nearby shops",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCachedData, setCachedData, toast]);

  useEffect(() => {
    if (userLocation) {
      fetchMerchants(userLocation);
    }
  }, [userLocation, fetchMerchants]);

  return { merchants, isLoading, refetch: () => userLocation && fetchMerchants(userLocation) };
};
