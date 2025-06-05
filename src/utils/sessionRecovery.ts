
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const attemptSessionRecovery = async () => {
  try {
    console.log('Attempting session recovery...');
    
    // Try to refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh failed:', error);
      
      // Clear any stale localStorage data
      localStorage.removeItem('booqit_auth');
      
      toast.error('Your session has expired. Please log in again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #a855f7',
          color: '#7c3aed'
        }
      });
      
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
    
    toast.error('Failed to restore your session. Please log in again.', {
      style: {
        background: '#f3e8ff',
        border: '1px solid #a855f7',
        color: '#7c3aed'
      }
    });
    
    return false;
  }
};

export const scheduleSessionCheck = () => {
  // Check session validity every 5 minutes
  setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Session check: No active session found');
      localStorage.removeItem('booqit_auth');
    } else {
      // Check if session is about to expire (within 5 minutes)
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
        console.log('Session expiring soon, attempting refresh...');
        await attemptSessionRecovery();
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};
