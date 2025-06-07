
import { supabase } from '@/integrations/supabase/client';

// Check if Supabase tokens exist in localStorage
export const hasSupabaseTokens = (): boolean => {
  try {
    const keys = Object.keys(localStorage);
    return keys.some(key => 
      key.includes('supabase') && 
      key.includes('auth') && 
      localStorage.getItem(key)
    );
  } catch {
    return false;
  }
};

// Clear only our own session reference (let Supabase handle its own keys)
export const clearOwnSessionStorage = (): void => {
  try {
    localStorage.removeItem("booqit-session");
    console.log('🧹 Cleared BooqIt session reference');
  } catch (error) {
    console.error('❌ Error clearing session storage:', error);
  }
};

// Attempt to recover session when tokens appear to be missing
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  try {
    console.log('🔄 Attempting session recovery...');
    
    // First try to get existing session (Supabase may have it internally)
    const { data: { session }, error: getError } = await supabase.auth.getSession();
    
    if (session && !getError) {
      console.log('✅ Session found during recovery');
      return {
        success: true,
        session,
        message: 'Session recovered successfully'
      };
    }
    
    // If no session found, try to refresh
    console.log('🔄 No session found, attempting refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshData?.session && !refreshError) {
      console.log('✅ Session recovered via refresh');
      return {
        success: true,
        session: refreshData.session,
        message: 'Session refreshed successfully'
      };
    }
    
    console.log('❌ Session recovery failed:', refreshError?.message);
    return {
      success: false,
      session: null,
      message: refreshError?.message || 'Session recovery failed'
    };
    
  } catch (error) {
    console.error('❌ Exception during session recovery:', error);
    return {
      success: false,
      session: null,
      message: 'Session recovery threw an exception'
    };
  }
};

// Check if session is valid (without causing side effects)
export const validateCurrentSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Error validating session:', error);
      return false;
    }
    
    if (session) {
      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at > now) {
        return true;
      } else {
        console.log('⏰ Session appears to be expired');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Exception validating session:', error);
    return false;
  }
};

// Show user-friendly message when session is lost
export const showSessionLostMessage = () => {
  const message = "Your session has expired or was cleared by the browser. Please log in again.";
  
  // Use a more user-friendly toast instead of alert
  if (typeof window !== 'undefined') {
    console.log('📢 Session lost message:', message);
    
    // Redirect to auth page after a short delay
    setTimeout(() => {
      window.location.href = '/auth';
    }, 2000);
    
    return message;
  }
};
