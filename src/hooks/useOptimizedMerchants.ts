
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';

const CACHE_KEY = 'nearby_merchants';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for better persistence

interface CachedData {
  merchants: Merchant[];
  timestamp: number;
  location: { lat: number; lng: number };
}

export const useOptimizedMerchants = (userLocation: { lat: number; lng: number } | null) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const cacheCheckedRef = useRef(false);

  // Check cache immediately on mount
  useEffect(() => {
    if (!cacheCheckedRef.current && userLocation) {
      const cached = getCachedData();
      if (cached) {
        console.log('Using cached merchants data');
        setMerchants(cached.merchants);
        cacheCheckedRef.current = true;
        return;
      }
      cacheCheckedRef.current = true;
    }
  }, [userLocation]);

  const getCachedData = useCallback((): CachedData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY); // Use localStorage for better persistence
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      // Check if location is similar (within 2km for less frequent updates)
      if (userLocation && data.location) {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          data.location.lat, data.location.lng
        );
        if (distance > 2) return null;
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
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
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
    if (fetchingRef.current || !mountedRef.current) return;

    try {
      fetchingRef.current = true;
      setIsLoading(true);

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (data && mountedRef.current) {
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
          .slice(0, 10);

        setMerchants(merchantsWithDistance);
        setCachedData(merchantsWithDistance, location);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load nearby shops",
          variant: "destructive"
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [setCachedData, toast]);

  useEffect(() => {
    if (userLocation && !getCachedData()) {
      fetchMerchants(userLocation);
    }
  }, [userLocation, fetchMerchants, getCachedData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { 
    merchants, 
    isLoading, 
    refetch: () => {
      if (userLocation) {
        fetchMerchants(userLocation);
      }
    }
  };
};
