
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
  const [isLoading, setIsLoading] = useState(true);
  const { userId, isAuthenticated } = useAuth();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || !isAuthenticated || fetchingRef.current || !mountedRef.current) {
        setIsLoading(false);
        return;
      }

      // Check cache first
      try {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const data: CachedProfile = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION && data.userId === userId) {
            console.log('Using cached profile data');
            setUserName(data.name.split(' ')[0] || 'there');
            setUserAvatar(data.avatar_url);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to read cached profile:', error);
      }

      try {
        fetchingRef.current = true;
        setIsLoading(true);

        console.log('Fetching profile for user:', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Profile fetch error:', error);
          // If no profile exists, use fallback
          if (error.code === 'PGRST116') {
            console.log('No profile found, using fallback');
            setUserName('there');
            setUserAvatar(null);
          }
        } else if (data && mountedRef.current) {
          console.log('Profile data fetched:', data);
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
        setUserName('there');
        setUserAvatar(null);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchUserProfile();
  }, [userId, isAuthenticated]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { userName, userAvatar, isLoading };
};
