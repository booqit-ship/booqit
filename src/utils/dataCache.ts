import { supabase } from '@/integrations/supabase/client';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  key: string;
}

class DataCache {
  private static instance: DataCache;
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    // Load from localStorage on init
    this.loadFromStorage();
  }

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('app_data_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, value as CacheItem<any>);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const cacheObj = Object.fromEntries(this.cache);
      localStorage.setItem('app_data_cache', JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      key
    };
    this.cache.set(key, item);
    this.saveToStorage();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return item.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.saveToStorage();
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    keys.forEach(key => this.cache.delete(key));
    this.saveToStorage();
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem('app_data_cache');
  }
}

export const dataCache = DataCache.getInstance();

// Generic cached fetch function
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = dataCache.get<T>(key);
  if (cached) {
    return cached;
  }

  const data = await fetchFn();
  dataCache.set(key, data, ttl);
  return data;
}

// Optimized Supabase query with caching
export async function cachedSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<any>,
  ttl?: number
): Promise<T> {
  return cachedFetch(key, async () => {
    const result = await queryFn();
    if (result.error) throw result.error;
    return result.data;
  }, ttl);
}