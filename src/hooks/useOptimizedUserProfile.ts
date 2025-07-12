
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { dataCache, cachedSupabaseQuery } from '@/utils/dataCache';

export const useOptimizedUserProfile = () => {
  const [userName, setUserName] = useState('there');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId, isAuthenticated } = useAuth();
  const fetchingRef = useRef(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated || !userId || fetchingRef.current) {
        return;
      }

      try {
        fetchingRef.current = true;
        setIsLoading(true);

        const cacheKey = `profile_${userId}`;
        
        const data = await cachedSupabaseQuery<{name: string; avatar_url: string | null} | null>(
          cacheKey,
          async () => {
            const result = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', userId)
              .maybeSingle();
            return result;
          },
          10 * 60 * 1000 // 10 minutes cache
        );

        if (data) {
          const firstName = data.name?.split(' ')[0] || 'there';
          setUserName(firstName);
          setUserAvatar(data.avatar_url);
        } else {
          // Profile doesn't exist, create it
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
                email: user.email || '',
                role: 'customer'
              })
              .select('name, avatar_url')
              .single();

            if (!createError && newProfile) {
              const firstName = newProfile.name?.split(' ')[0] || 'there';
              setUserName(firstName);
              setUserAvatar(newProfile.avatar_url);
              
              // Cache the new profile
              dataCache.set(cacheKey, newProfile, 10 * 60 * 1000);
            } else {
              setUserName('there');
            }
          }
        }
      } catch (error) {
        console.error('Error in profile fetch:', error);
        setUserName('there');
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchUserProfile();
  }, [userId, isAuthenticated]);

  // Clear cache when user changes
  useEffect(() => {
    if (!isAuthenticated) {
      setUserName('there');
      setUserAvatar(null);
      dataCache.invalidatePattern('profile_');
    }
  }, [isAuthenticated]);

  return { userName, userAvatar, isLoading };
};
