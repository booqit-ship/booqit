
import { PermanentSession } from './permanentSession';
import { supabase } from '@/integrations/supabase/client';

// Check if we have permanent session (no Supabase dependency)
export const hasPermanentSession = (): boolean => {
  return PermanentSession.isLoggedIn();
};

// Clear only our session references (not Supabase)
export const clearOwnSessionStorage = (): void => {
  try {
    PermanentSession.clearSession();
    console.log('🧹 Cleared permanent session');
  } catch (error) {
    console.error('❌ Error clearing session storage:', error);
  }
};

// Enhanced session validation with proactive refresh
export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🔍 Validating current session with proactive refresh');
  
  try {
    // First try to refresh the session proactively
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshData?.session && !refreshError) {
      console.log('✅ Session refreshed successfully');
      
      // Update permanent session with refreshed data
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && permanentData.userRole) {
        PermanentSession.saveSession(
          refreshData.session, 
          permanentData.userRole, 
          refreshData.session.user.id
        );
      }
      return true;
    }
    
    // If refresh failed, try to get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionData?.session && !sessionError) {
      console.log('✅ Current session is valid');
      return true;
    }
    
    console.log('❌ Session validation failed:', { refreshError, sessionError });
    return false;
    
  } catch (error) {
    console.error('❌ Exception during session validation:', error);
    return false;
  }
};

// Enhanced session recovery with exponential backoff retry mechanism
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 Attempting session recovery with exponential backoff retries');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  // Try to validate/refresh session with exponential backoff retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Recovery attempt ${attempt}/3`);
      
      const isValid = await validateCurrentSession();
      
      if (isValid) {
        // Get the current session after successful validation
        const { data: { session } } = await supabase.auth.getSession();
        return {
          success: true,
          session: session || permanentData.session,
          message: `Recovery succeeded on attempt ${attempt}`
        };
      }
      
      // Exponential backoff: wait 2^attempt seconds before retry
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`❌ Recovery attempt ${attempt} failed:`, error);
      
      // On last attempt, try one more time with just token refresh
      if (attempt === 3) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            return {
              success: true,
              session: refreshData.session,
              message: 'Recovery succeeded with final token refresh'
            };
          }
        } catch (finalError) {
          console.error('❌ Final recovery attempt failed:', finalError);
        }
      }
    }
  }
  
  return {
    success: false,
    session: null,
    message: 'Session recovery failed after 3 attempts with exponential backoff'
  };
};

// Enhanced session expiry handler with improved retry mechanism
export const handleSessionExpiry = async (): Promise<void> => {
  console.log('⚠️ Handling session expiry with enhanced retry mechanism');
  
  // Try to recover session with exponential backoff retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Expiry recovery attempt ${attempt}/3`);
      
      const recovery = await attemptSessionRecovery();
      
      if (recovery.success) {
        console.log('✅ Session recovered during expiry handling');
        return;
      }
      
      // Exponential backoff for expiry recovery
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`❌ Expiry recovery attempt ${attempt} failed:`, error);
    }
  }
  
  // If all retries failed, clear session and redirect
  console.log('❌ All expiry recovery attempts failed, clearing session');
  PermanentSession.clearSession();
  
  // Clear all Supabase keys
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
  );
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  setTimeout(() => {
    window.location.href = '/auth';
  }, 100);
};

// Show user-friendly message when session is lost
export const showSessionLostMessage = () => {
  const message = "Your session has been lost. Please log in again.";
  
  if (typeof window !== 'undefined') {
    console.log('📢 Session lost message:', message);
    return message;
  }
};
