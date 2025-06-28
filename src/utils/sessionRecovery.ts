
import { PermanentSession } from './permanentSession';
import { supabase } from '@/integrations/supabase/client';

export const hasPermanentSession = (): boolean => {
  return PermanentSession.isLoggedIn();
};

export const clearOwnSessionStorage = (): void => {
  try {
    PermanentSession.clearSession();
    localStorage.removeItem('user_profile');
    localStorage.removeItem('user_location');
    sessionStorage.clear();
    console.log('🧹 SESSION: Cleared all session storage');
  } catch (error) {
    console.error('❌ SESSION: Error clearing session storage:', error);
  }
};

export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🔍 SESSION: Validating current session');
  
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ SESSION: Session error:', sessionError);
      
      // Handle refresh token errors specifically
      if (sessionError.message?.includes('refresh_token_not_found') || 
          sessionError.message?.includes('Invalid Refresh Token')) {
        console.log('❌ SESSION: Refresh token expired or invalid');
        return false;
      }
      
      return false;
    }
    
    if (sessionData?.session?.user) {
      console.log('✅ SESSION: Current session is valid');
      return true;
    }
    
    console.log('❌ SESSION: No valid session found');
    return false;
    
  } catch (error: any) {
    console.error('❌ SESSION: Session validation failed:', error);
    
    // Handle network or other errors
    if (error?.status === 400 || error?.status === 401) {
      console.log('❌ SESSION: Authentication failed with status:', error.status);
      return false;
    }
    
    return false;
  }
};

export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 SESSION: Attempting session recovery');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  try {
    // Check if current session is valid
    const isValid = await validateCurrentSession();
    
    if (isValid) {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        success: true,
        session: session,
        message: 'Session recovery successful'
      };
    }
    
    // Session is invalid, clear permanent session
    console.log('⚠️ SESSION: Session invalid, clearing permanent session');
    PermanentSession.clearSession();
    
    return {
      success: false,
      session: null,
      message: 'Session expired - please log in again'
    };
    
  } catch (error: any) {
    console.error('❌ SESSION: Recovery failed:', error);
    
    // Clear permanent session on any recovery failure
    PermanentSession.clearSession();
    clearOwnSessionStorage();
    
    return {
      success: false,
      session: null,
      message: `Session recovery failed: ${error.message || 'Unknown error'}`
    };
  }
};

export const handleSessionExpiry = async (showNotification?: (message: string) => void): Promise<void> => {
  console.log('⚠️ SESSION: Handling session expiry gracefully');
  
  // Show user notification if callback provided
  if (showNotification) {
    showNotification('Your session has expired. Please log in again.');
  }
  
  // Clear all session data
  clearOwnSessionStorage();
  
  // Clear Supabase auth state
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ SESSION: Error during signOut:', error);
  }
  
  // Redirect to login
  setTimeout(() => {
    window.location.href = '/auth';
  }, 1500);
};

export const performAuthHealthCheck = async (): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check Supabase connection
    const { data: { session }, error: connectionError } = await supabase.auth.getSession();
    
    if (connectionError) {
      if (connectionError.message?.includes('refresh_token_not_found')) {
        issues.push('Refresh token expired');
        recommendations.push('Clear session and re-authenticate');
      } else {
        issues.push('Supabase connection error');
        recommendations.push('Check internet connection and Supabase configuration');
      }
    }
    
    // Check permanent session consistency
    const permanentData = PermanentSession.getSession();
    
    if (permanentData.isLoggedIn && !session) {
      issues.push('Session inconsistency detected');
      recommendations.push('Clear permanent session and re-authenticate');
    }
    
    // Check for token expiry
    if (session?.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeToExpiry < 5 * 60 * 1000) { // Less than 5 minutes
        issues.push('Session expiring soon');
        recommendations.push('Session will expire soon, consider refreshing');
      }
    }
    
  } catch (error: any) {
    issues.push(`Health check failed: ${error.message}`);
    recommendations.push('Clear session data and re-authenticate');
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations
  };
};
