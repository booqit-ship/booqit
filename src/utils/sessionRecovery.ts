
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

// Simplified session validation without aggressive refresh
export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🔍 Validating current session (simplified)');
  
  try {
    // Just check if we have a valid session, don't force refresh
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionData?.session && !sessionError) {
      console.log('✅ Current session is valid');
      return true;
    }
    
    console.log('❌ Session validation failed:', { sessionError });
    return false;
    
  } catch (error) {
    console.error('❌ Exception during session validation:', error);
    return false;
  }
};

// Simplified session recovery without aggressive retries
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 Attempting simple session recovery');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  try {
    // Single attempt to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      return {
        success: true,
        session: session,
        message: 'Recovery succeeded with current session'
      };
    }
    
    // If no current session, try one refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshData?.session && !refreshError) {
      // Update permanent session with refreshed data
      if (permanentData.userRole && permanentData.userId) {
        PermanentSession.saveSession(refreshData.session, permanentData.userRole, permanentData.userId);
      }
      
      return {
        success: true,
        session: refreshData.session,
        message: 'Recovery succeeded with refresh'
      };
    }
    
    return {
      success: false,
      session: null,
      message: 'Session recovery failed'
    };
    
  } catch (error) {
    console.error('❌ Session recovery error:', error);
    return {
      success: false,
      session: null,
      message: `Session recovery failed: ${error.message}`
    };
  }
};

// Simplified session expiry handler
export const handleSessionExpiry = async (): Promise<void> => {
  console.log('⚠️ Handling session expiry');
  
  try {
    const recovery = await attemptSessionRecovery();
    
    if (recovery.success) {
      console.log('✅ Session recovered during expiry handling');
      return;
    }
  } catch (error) {
    console.error('❌ Expiry recovery failed:', error);
  }
  
  // If recovery failed, clear session and redirect
  console.log('❌ Session recovery failed, clearing session');
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
