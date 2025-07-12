
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { dataCache, cachedSupabaseQuery } from '@/utils/dataCache';

export const useOptimizedMerchants = (userLocation: { lat: number; lng: number } | null) => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fetchingRef = useRef(false);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const deg2rad = useCallback((deg: number) => deg * (Math.PI / 180), []);

  const fetchMerchants = useCallback(async (location: { lat: number; lng: number }) => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setIsLoading(true);

      const cacheKey = `merchants_${Math.round(location.lat * 100)}_${Math.round(location.lng * 100)}`;
      
      const data = await cachedSupabaseQuery<any[]>(
        cacheKey,
        async () => {
          const result = await supabase
            .from('merchants')
            .select('*')
            .order('rating', { ascending: false });
          return result;
        },
        5 * 60 * 1000 // 5 minutes cache
      );

      if (data) {
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
          .filter(merchant => (merchant.distanceValue || 0) <= 20)
          .sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0))
          .slice(0, 15);

        setMerchants(merchantsWithDistance);
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
      fetchingRef.current = false;
    }
  }, [calculateDistance, toast]);

  const memoizedLocation = useMemo(() => {
    if (!userLocation) return null;
    return {
      lat: Math.round(userLocation.lat * 1000) / 1000,
      lng: Math.round(userLocation.lng * 1000) / 1000
    };
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (memoizedLocation) {
      fetchMerchants(memoizedLocation);
    }
  }, [memoizedLocation, fetchMerchants]);

  return { 
    merchants, 
    isLoading, 
    refetch: () => {
      if (memoizedLocation) {
        dataCache.invalidatePattern('merchants_');
        fetchMerchants(memoizedLocation);
      }
    }
  };
};
