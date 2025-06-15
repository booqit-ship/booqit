
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

// Simple session validation without aggressive refresh
export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🔍 Validating current session (simple check)');
  
  try {
    // Just check if we have a valid session, don't force operations
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

// Very conservative session recovery
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 Attempting conservative session recovery');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  try {
    // Only try to get current session, no aggressive refreshing
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      return {
        success: true,
        session: session,
        message: 'Recovery succeeded with current session'
      };
    }
    
    return {
      success: false,
      session: null,
      message: 'Session recovery failed - please log in again'
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
  console.log('⚠️ Handling session expiry - clearing and redirecting');
  
  // Clear permanent session
  PermanentSession.clearSession();
  
  // Clear Supabase auth state
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ Error during signOut:', error);
  }
  
  // Redirect to login
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
