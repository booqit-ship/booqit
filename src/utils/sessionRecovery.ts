
import { PermanentSession } from './permanentSession';

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

// DISABLED - No session recovery attempts
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🚫 Session recovery disabled - using permanent sessions only');
  
  const permanentData = PermanentSession.getSession();
  
  return {
    success: permanentData.isLoggedIn,
    session: permanentData.session,
    message: permanentData.isLoggedIn ? 'Using permanent session' : 'No permanent session found'
  };
};

// DISABLED - No session validation
export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🚫 Session validation disabled - using permanent sessions only');
  return PermanentSession.isLoggedIn();
};

// Show user-friendly message when session is lost (but don't auto-redirect)
export const showSessionLostMessage = () => {
  const message = "Your session has been lost. Please log in again.";
  
  if (typeof window !== 'undefined') {
    console.log('📢 Session lost message:', message);
    return message;
  }
};
