
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PROFILE_CACHE_KEY = 'user_profile';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedProfile {
  name: string;
  avatar_url: string | null;
  timestamp: number;
  userId: string;
}

export const useOptimizedUserProfile = () => {
  const [userName, setUserName] = useState('there');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const cacheCheckedRef = useRef(false);

  // Check cache immediately
  useEffect(() => {
    if (!cacheCheckedRef.current && userId) {
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const data: CachedProfile = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION && data.userId === userId) {
            setUserName(data.name.split(' ')[0]);
            setUserAvatar(data.avatar_url);
            cacheCheckedRef.current = true;
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to read cached profile:', error);
      }
      cacheCheckedRef.current = true;
    }
  }, [userId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || fetchingRef.current || !mountedRef.current) return;

      // Check if we already have cached data
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const data: CachedProfile = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION && data.userId === userId) {
            return; // Already have fresh data
          }
        }
      } catch (error) {
        console.warn('Failed to read cached profile:', error);
      }

      try {
        fetchingRef.current = true;
        setIsLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (data && mountedRef.current) {
          const firstName = data.name?.split(' ')[0] || 'there';
          setUserName(firstName);
          setUserAvatar(data.avatar_url);

          // Cache the data
          const cacheData: CachedProfile = {
            name: data.name || 'there',
            avatar_url: data.avatar_url,
            timestamp: Date.now(),
            userId: userId
          };
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { userName, userAvatar, isLoading };
};
