
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
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('user-role');
    console.log('🧹 Cleared BooqIt session references');
  } catch (error) {
    console.error('❌ Error clearing session storage:', error);
  }
};

// VERY gentle session recovery - only try once and never force anything
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  try {
    console.log('🔄 Attempting very gentle session recovery...');
    
    // Only try to get existing session - no refresh attempts
    const { data: { session }, error: getError } = await supabase.auth.getSession();
    
    if (session && !getError) {
      console.log('✅ Session found during gentle recovery');
      return {
        success: true,
        session,
        message: 'Session recovered successfully'
      };
    }
    
    console.log('❌ No active session found (this is normal after tab switches)');
    return {
      success: false,
      session: null,
      message: 'No active session found'
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

// Very gentle session validation
export const validateCurrentSession = async (): Promise<boolean> => {
  try {
    // First check our own flag
    const loggedInFlag = localStorage.getItem('loggedIn');
    if (!loggedInFlag) {
      return false;
    }

    // Then gently check Supabase session without any recovery attempts
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Error validating session (this might be normal):', error.message);
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

// Show user-friendly message when session is lost (but don't auto-redirect)
export const showSessionLostMessage = () => {
  const message = "Your session has expired. Please refresh the page or log in again if needed.";
  
  if (typeof window !== 'undefined') {
    console.log('📢 Session lost message:', message);
    return message;
  }
};
