
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const attemptSessionRecovery = async () => {
  try {
    console.log('Attempting session recovery...');
    
    // First check if we have a current session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession) {
      console.log('Current session is valid');
      
      // Verify stored auth data matches current session
      const storedAuth = localStorage.getItem('booqit_auth');
      if (storedAuth) {
        try {
          const parsedAuth = JSON.parse(storedAuth);
          const storedSessionId = parsedAuth.sessionId;
          const currentSessionId = currentSession.access_token;
          
          if (storedSessionId && storedSessionId !== currentSessionId) {
            console.log('Session ID mismatch, clearing stale data');
            localStorage.removeItem('booqit_auth');
          }
        } catch (e) {
          console.log('Invalid stored auth data, clearing');
          localStorage.removeItem('booqit_auth');
        }
      }
      
      return true;
    }
    
    // Try to refresh the session only if we don't have a current session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh failed:', error);
      
      // Clear any stale localStorage data
      localStorage.removeItem('booqit_auth');
      
      // Only show toast if it's not a common initialization error
      if (!error.message.includes('refresh_token_not_found') && 
          !error.message.includes('session_not_found')) {
        toast.error('Your session has expired. Please log in again.', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #a855f7',
            color: '#7c3aed'
          }
        });
      }
      
      return false;
    }
    
    if (session) {
      console.log('Session recovered successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Exception during session recovery:', error);
    
    // Clear any stale localStorage data
    localStorage.removeItem('booqit_auth');
    
    return false;
  }
};

export const scheduleSessionCheck = () => {
  // Check session validity every 10 minutes (reduced frequency)
  const intervalId = setInterval(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('Session check: No active session found');
        localStorage.removeItem('booqit_auth');
      } else {
        // Check if session is about to expire (within 10 minutes)
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry < 10 * 60 * 1000) { // Less than 10 minutes
          console.log('Session expiring soon, attempting refresh...');
          await attemptSessionRecovery();
        }
      }
    } catch (error) {
      console.error('Error in session check:', error);
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};
