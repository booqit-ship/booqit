
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

// Enhanced session validation with retry logic
export const validateCurrentSession = async (): Promise<boolean> => {
  console.log('🔍 Validating current session');
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData?.session && !sessionError) {
        console.log('✅ Current session is valid');
        return true;
      }
      
      // If session is invalid, try to refresh
      if (attempts < maxAttempts - 1) {
        console.log(`🔄 Session validation attempt ${attempts + 1} failed, retrying...`);
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('❌ Session refresh failed:', refreshError.message);
        } else {
          console.log('✅ Session refreshed successfully');
        }
      }
      
    } catch (error) {
      console.error(`❌ Session validation attempt ${attempts + 1} failed:`, error);
    }
    
    attempts++;
    
    if (attempts < maxAttempts) {
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
  
  console.log('❌ All session validation attempts failed');
  return false;
};

// Enhanced session recovery with better error handling
export const attemptSessionRecovery = async (): Promise<{
  success: boolean;
  session: any | null;
  message: string;
}> => {
  console.log('🔄 Attempting enhanced session recovery');
  
  const permanentData = PermanentSession.getSession();
  
  if (!permanentData.isLoggedIn) {
    return {
      success: false,
      session: null,
      message: 'No permanent session found'
    };
  }
  
  try {
    // First, try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      return {
        success: true,
        session: session,
        message: 'Recovery succeeded with current session'
      };
    }
    
    // If no current session, try to refresh
    console.log('🔄 Attempting session refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshData.session && !refreshError) {
      return {
        success: true,
        session: refreshData.session,
        message: 'Recovery succeeded with refreshed session'
      };
    }
    
    // If refresh fails, clear permanent session
    console.log('❌ Session refresh failed, clearing permanent session');
    PermanentSession.clearSession();
    
    return {
      success: false,
      session: null,
      message: 'Session recovery failed - please log in again'
    };
    
  } catch (error: any) {
    console.error('❌ Session recovery error:', error);
    
    // Clear permanent session on critical errors
    PermanentSession.clearSession();
    
    return {
      success: false,
      session: null,
      message: `Session recovery failed: ${error.message}`
    };
  }
};

// Graceful session expiry handler with user notification
export const handleSessionExpiry = async (showNotification?: (message: string) => void): Promise<void> => {
  console.log('⚠️ Handling session expiry gracefully');
  
  // Show user notification if callback provided
  if (showNotification) {
    showNotification('Your session has expired. Please log in again.');
  }
  
  // Clear permanent session
  PermanentSession.clearSession();
  
  // Clear Supabase auth state
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ Error during signOut:', error);
  }
  
  // Clear any cached data
  try {
    sessionStorage.removeItem('performance-metrics');
    localStorage.removeItem('booking-draft');
  } catch (error) {
    console.error('❌ Error clearing cached data:', error);
  }
  
  // Redirect to login with delay for user to see message
  setTimeout(() => {
    window.location.href = '/auth';
  }, 2000);
};

// Health check for authentication system
export const performAuthHealthCheck = async (): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check Supabase connection
    const { error: connectionError } = await supabase.auth.getSession();
    if (connectionError) {
      issues.push('Supabase connection error');
      recommendations.push('Check internet connection and Supabase configuration');
    }
    
    // Check permanent session consistency
    const permanentData = PermanentSession.getSession();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (permanentData.isLoggedIn && !session) {
      issues.push('Permanent session inconsistency');
      recommendations.push('Clear permanent session and re-authenticate');
    }
    
    // Check for expired tokens
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
    recommendations.push('Contact support if issues persist');
  }
  
  return {
    is </Healthy: issues.length === 0,
    issues,
    recommendations
  };
};
