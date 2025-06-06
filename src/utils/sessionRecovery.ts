
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const validateCurrentSession = async () => {
  try {
    console.log('Validating current session...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation failed:', error);
      toast.error('Session validation failed. Please login again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
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
    toast.error('Session error. Please refresh the page.', {
      style: {
        background: '#f3e8ff',
        border: '1px solid #d8b4fe',
        color: '#7c3aed'
      }
    });
    return false;
  }
};

export const recoverSession = async () => {
  try {
    console.log('Attempting session recovery...');
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session recovery failed:', error);
      toast.error('Unable to restore session. Please login again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      return null;
    }
    
    if (session) {
      console.log('Session recovered successfully');
      toast.success('Session restored successfully', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Exception during session recovery:', error);
    return null;
  }
};
