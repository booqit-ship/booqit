
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

// Enhanced session recovery with retry mechanism
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 Attempting session recovery with retries');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  // Try to validate/refresh session with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Recovery attempt ${attempt}/3`);
      
      const isValid = await validateCurrentSession();
      
      if (isValid) {
        return {
          success: true,
          session: permanentData.session,
          message: `Session recovered on attempt ${attempt}`
        };
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
    } catch (error) {
      console.error(`❌ Recovery attempt ${attempt} failed:`, error);
    }
  }
  
  return {
    success: false,
    session: null,
    message: 'Session recovery failed after 3 attempts'
  };
};

// Enhanced session expiry handler with retry mechanism
export const handleSessionExpiry = async (): Promise<void> => {
  console.log('⚠️ Handling session expiry with retry mechanism');
  
  // Try to recover session with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Expiry recovery attempt ${attempt}/3`);
      
      const recovery = await attemptSessionRecovery();
      
      if (recovery.success) {
        console.log('✅ Session recovered during expiry handling');
        return;
      }
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
      
    } catch (error) {
      console.error(`❌ Expiry recovery attempt ${attempt} failed:`, error);
    }
  }
  
  // If all retries failed, clear session and redirect
  console.log('❌ All recovery attempts failed, clearing session');
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
