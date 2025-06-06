
import { supabase } from '@/integrations/supabase/client';

export const clearStaleAuthData = () => {
  try {
    console.log('Clearing potentially stale auth data...');
    localStorage.removeItem('booqit_auth');
    console.log('Stale auth data cleared');
  } catch (error) {
    console.error('Error clearing stale auth data:', error);
  }
};

export const validateCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation failed:', error);
      clearStaleAuthData();
      return false;
    }
    
    if (session) {
      console.log('Session validated successfully');
      return true;
    }
    
    console.log('No active session found');
    return false;
  } catch (error) {
    console.error('Exception during session validation:', error);
    clearStaleAuthData();
    return false;
  }
};
