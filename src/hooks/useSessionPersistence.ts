
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  hasSupabaseTokens, 
  attemptSessionRecovery, 
  validateCurrentSession,
  showSessionLostMessage 
} from '@/utils/sessionRecovery';
import { toast } from 'sonner';

export const useSessionPersistence = () => {
  const { isAuthenticated, loading, setAuth, user } = useAuth();
  const recoveryAttempted = useRef(false);
  const validationInProgress = useRef(false);

  // Handle cases where tokens might be missing
  const handleMissingTokens = async () => {
    if (recoveryAttempted.current) {
      return; // Don't attempt recovery multiple times
    }
    
    recoveryAttempted.current = true;
    console.log('🔍 Tokens appear to be missing, attempting recovery...');
    
    const recovery = await attemptSessionRecovery();
    
    if (recovery.success && recovery.session) {
      console.log('✅ Session recovered successfully');
      
      // Update auth state with recovered session
      const role = recovery.session.user?.user_metadata?.role || 'customer';
      setAuth(true, role, recovery.session.user.id);
      
      toast.success('Session restored successfully', {
        duration: 3000,
      });
    } else {
      console.log('❌ Session recovery failed:', recovery.message);
      
      // Show user-friendly message and redirect
      toast.error('Your session has expired. Please log in again.', {
        duration: 4000,
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      
      showSessionLostMessage();
    }
  };

  // Periodic session validation (less aggressive)
  const performPeriodicValidation = async () => {
    if (validationInProgress.current || loading || !isAuthenticated) {
      return;
    }

    try {
      validationInProgress.current = true;
      console.log('🔍 Performing periodic session validation...');
      
      // Check if tokens are missing first
      if (!hasSupabaseTokens()) {
        console.log('⚠️ Tokens missing during validation');
        await handleMissingTokens();
        return;
      }
      
      // Validate current session
      const isValid = await validateCurrentSession();
      
      if (!isValid) {
        console.log('⚠️ Session validation failed, attempting recovery...');
        await handleMissingTokens();
      } else {
        console.log('✅ Session validation passed');
      }
      
    } catch (error) {
      console.error('❌ Error during periodic validation:', error);
      // Don't immediately logout on validation errors
    } finally {
      validationInProgress.current = false;
    }
  };

  // Handle visibility changes (tab focus/unfocus)
  const handleVisibilityChange = async () => {
    if (!document.hidden && !loading && isAuthenticated) {
      console.log('👁️ Tab became visible, checking session...');
      
      // Reset recovery attempt flag when tab becomes visible
      recoveryAttempted.current = false;
      
      // Perform validation after a short delay
      setTimeout(performPeriodicValidation, 1000);
    }
  };

  // Handle window focus
  const handleFocus = async () => {
    if (!loading && isAuthenticated) {
      console.log('🎯 Window focused, checking session...');
      
      // Reset recovery attempt flag
      recoveryAttempted.current = false;
      
      setTimeout(performPeriodicValidation, 1000);
    }
  };

  // Handle online/offline events
  const handleOnline = async () => {
    if (!loading && isAuthenticated) {
      console.log('🌐 Connection restored, checking session...');
      
      // Reset recovery attempt flag
      recoveryAttempted.current = false;
      
      setTimeout(performPeriodicValidation, 2000);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !loading) {
      // Set up periodic validation (every 5 minutes, less aggressive)
      const intervalId = setInterval(performPeriodicValidation, 5 * 60 * 1000);
      
      // Perform initial validation after a delay
      setTimeout(performPeriodicValidation, 3000);
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    // Add event listeners for app lifecycle events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, loading]);
};
