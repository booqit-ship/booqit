
import { supabase } from '@/integrations/supabase/client';

export const validateCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation failed:', error);
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
    return false;
  }
};
