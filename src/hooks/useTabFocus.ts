
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const useTabFocus = () => {
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();
  const lastFocusTime = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        const timeSinceLastFocus = Date.now() - lastFocusTime.current;
        
        // If tab was inactive for more than 30 seconds, refresh critical data
        if (timeSinceLastFocus > 30000) {
          console.log('🔄 Tab became visible after long inactivity, refreshing data');
          
          // Invalidate and refetch critical queries
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['merchant'] });
          queryClient.invalidateQueries({ queryKey: ['services'] });
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
          
          // Force immediate refetch
          queryClient.refetchQueries({ queryKey: ['bookings'] });
          queryClient.refetchQueries({ queryKey: ['merchant'] });
        }
        
        lastFocusTime.current = Date.now();
      }
    };

    const handleFocus = () => {
      if (isAuthenticated) {
        console.log('🎯 Window regained focus, refreshing data');
        queryClient.refetchQueries({ type: 'active' });
        lastFocusTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, isAuthenticated, userId]);
};
