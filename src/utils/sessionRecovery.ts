
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const validateCurrentSession = async () => {
  try {
    console.log('Validating current session...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation failed:', error);
      // Don't show error toast for normal session expiry
      return false;
    }
    
    if (session) {
      console.log('Session validated successfully');
      // Update activity timestamp in localStorage
      const storedData = localStorage.getItem('booqit-session-data');
      if (storedData) {
        try {
          const sessionData = JSON.parse(storedData);
          sessionData.lastActivity = Date.now();
          localStorage.setItem('booqit-session-data', JSON.stringify(sessionData));
        } catch (e) {
          console.warn('Could not update session activity timestamp');
        }
      }
      return true;
    }
    
    console.log('No active session found');
    return false;
  } catch (error) {
    console.error('Exception during session validation:', error);
    return false;
  }
};

export const recoverSession = async () => {
  try {
    console.log('Attempting session recovery...');
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session recovery failed:', error);
      toast.error('Session expired. Please login again.', {
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
      toast.success('Session restored', {
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

export const getSessionTimeRemaining = () => {
  try {
    const storedData = localStorage.getItem('booqit-session-data');
    if (!storedData) return 0;
    
    const sessionData = JSON.parse(storedData);
    if (!sessionData.sessionExpiry) return 0;
    
    const expiryTime = sessionData.sessionExpiry * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeRemaining = expiryTime - currentTime;
    
    return Math.max(0, timeRemaining);
  } catch (error) {
    console.warn('Error calculating session time remaining:', error);
    return 0;
  }
};
