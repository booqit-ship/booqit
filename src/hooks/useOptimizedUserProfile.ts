
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PROFILE_CACHE_KEY = 'user_profile';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface CachedProfile {
  name: string;
  avatar_url: string | null;
  timestamp: number;
}

export const useOptimizedUserProfile = () => {
  const [userName, setUserName] = useState('there');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Check cache first
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const data: CachedProfile = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            setUserName(data.name.split(' ')[0]);
            setUserAvatar(data.avatar_url);
            setIsLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (data) {
          const firstName = data.name?.split(' ')[0] || 'there';
          setUserName(firstName);
          setUserAvatar(data.avatar_url);

          // Cache the data
          const cacheData: CachedProfile = {
            name: data.name || 'there',
            avatar_url: data.avatar_url,
            timestamp: Date.now()
          };
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  return { userName, userAvatar, isLoading };
};
