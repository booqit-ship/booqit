
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading } = useAuth();
  const validationInProgress = useRef(false);

  // Very light periodic validation (only every 30 minutes)
  const performLightValidation = async () => {
    if (validationInProgress.current || loading || !isAuthenticated) {
      return;
    }

    try {
      validationInProgress.current = true;
      console.log('🔍 Performing light session validation...');
      
      // Only check if session exists, don't force refresh
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!session && !error) {
        console.log('⚠️ No session found during validation, but not forcing logout');
        // Don't force logout - let user continue until they explicitly logout or encounter an API error
      } else if (session) {
        console.log('✅ Session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during light validation:', error);
      // Don't logout on validation errors - just log them
    } finally {
      validationInProgress.current = false;
    }
  };

  // Handle window focus (very light check)
  const handleFocus = async () => {
    if (!loading && isAuthenticated) {
      console.log('🎯 Window focused, performing light check...');
      
      // Only check localStorage flag, don't hit Supabase
      const loggedInFlag = localStorage.getItem('loggedIn');
      if (!loggedInFlag) {
        console.log('⚠️ No logged in flag found, but not forcing logout');
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && !loading) {
      // Set up very infrequent validation (every 30 minutes)
      const intervalId = setInterval(performLightValidation, 30 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    // Add event listeners for app lifecycle events (but make them very light)
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, loading]);
};
