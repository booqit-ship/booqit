
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only set up persistence hooks if user is authenticated
    if (!isAuthenticated || loading) return;

    const refreshSession = async () => {
      try {
        console.log('Refreshing session due to focus/visibility change...');
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Failed to refresh session:', error);
        } else if (session) {
          console.log('Session refreshed successfully');
        }
      } catch (error) {
        console.error('Exception during session refresh:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing session...');
        refreshSession();
      }
    };

    const handleFocus = () => {
      console.log('Window focused, refreshing session...');
      refreshSession();
    };

    const handleOnline = () => {
      console.log('Connection restored, refreshing session...');
      refreshSession();
    };

    // Add event listeners for various scenarios
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, loading]);
};
