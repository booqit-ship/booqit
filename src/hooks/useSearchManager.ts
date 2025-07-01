
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';

export const useSearchManager = (userLocation: { lat: number; lng: number } | null) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Merchant[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .or(`shop_name.ilike.%${query}%,category.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      if (data) {
        const resultsWithDistance = userLocation
          ? data.map((merchant) => {
              const distance = calculateDistance(
                userLocation.lat, userLocation.lng, merchant.lat, merchant.lng
              );
              return {
                ...merchant,
                distance: `${distance.toFixed(1)} km`,
                distanceValue: distance
              };
            })
          : data;

        setSearchResults(resultsWithDistance as Merchant[]);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  }, [userLocation, calculateDistance]);

  const clearSearch = useCallback(() => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showSearchResults,
    handleSearch,
    clearSearch
  };
};
