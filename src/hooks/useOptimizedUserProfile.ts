
import { useState, useEffect, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { userId, isAuthenticated } = useAuth();
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Don't fetch if not authenticated or no userId
      if (!isAuthenticated || !userId || fetchingRef.current || lastUserIdRef.current === userId) {
        return;
      }

      try {
        // Check cache first
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          try {
            const data: CachedProfile = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_DURATION) {
              setUserName(data.name.split(' ')[0] || 'there');
              setUserAvatar(data.avatar_url);
              return;
            }
          } catch (cacheError) {
            console.warn('Cache parsing failed, will fetch fresh data');
          }
        }

        fetchingRef.current = true;
        lastUserIdRef.current = userId;
        setIsLoading(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (error) {
          console.error('Error fetching user profile:', error);
          
          // If profile doesn't exist, create it
          if (error.code === 'PGRST116' || error.message?.includes('no rows returned')) {
            console.log('Profile not found, creating default profile');
            
            try {
              // Get user info from auth
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

                if (createError) {
                  console.error('Error creating profile:', createError);
                  setUserName('there');
                } else if (newProfile) {
                  const firstName = newProfile.name?.split(' ')[0] || 'there';
                  setUserName(firstName);
                  setUserAvatar(newProfile.avatar_url);
                  
                  // Cache the new profile
                  const cacheData: CachedProfile = {
                    name: newProfile.name || 'there',
                    avatar_url: newProfile.avatar_url,
                    timestamp: Date.now()
                  };
                  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
                }
              }
            } catch (createError) {
              console.error('Failed to create profile:', createError);
              setUserName('there');
            }
          } else {
            // For other errors, use fallback
            setUserName('there');
          }
        } else if (data) {
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
        } else {
          // No data returned but no error - profile doesn't exist
          setUserName('there');
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
      localStorage.removeItem(PROFILE_CACHE_KEY);
      lastUserIdRef.current = '';
    }
  }, [isAuthenticated]);

  return { userName, userAvatar, isLoading };
};
