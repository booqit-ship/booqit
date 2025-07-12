import { useCallback } from 'react';
import { dataCache } from '@/utils/dataCache';

export const useCachedData = () => {
  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      dataCache.invalidatePattern(pattern);
    } else {
      dataCache.clear();
    }
  }, []);

  const setCacheData = useCallback((key: string, data: any, ttl?: number) => {
    dataCache.set(key, data, ttl);
  }, []);

  const getCacheData = useCallback((key: string) => {
    return dataCache.get(key);
  }, []);

  return {
    invalidateCache,
    setCacheData,
    getCacheData
  };
};