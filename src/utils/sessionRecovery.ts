
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Maximum retry attempts for session operations
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Timeout for session operations (5 seconds)
 */
const SESSION_TIMEOUT = 5000;

/**
 * Creates a promise that rejects after a specified timeout
 */
const createTimeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
};

/**
 * Executes a promise with a timeout
 */
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([promise, createTimeoutPromise(timeoutMs)]);
};

/**
 * Validates current session with timeout and retry logic
 */
export const validateCurrentSession = async (retryCount = 0): Promise<boolean> => {
  try {
    console.log(`🔍 Validating current session (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
    
    // Always refresh session first to ensure it's current
    await refreshSessionProactively();
    
    // Get session with timeout
    const { data: { session }, error } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT
    );
    
    if (error) {
      console.error('❌ Session validation failed:', error);
      
      // Retry on failure up to MAX_RETRY_ATTEMPTS
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        console.log(`🔄 Retrying session validation (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return validateCurrentSession(retryCount + 1);
      }
      
      toast.error('Session validation failed. Please login again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      return false;
    }
    
    if (session?.user) {
      console.log('✅ Session validated successfully');
      return true;
    }
    
    console.log('❌ No active session found');
    return false;
  } catch (error) {
    console.error('❌ Exception during session validation:', error);
    
    // Retry on timeout or other errors
    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`🔄 Retrying session validation after error (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return validateCurrentSession(retryCount + 1);
    }
    
    toast.error('Session error. Please refresh the page or login again.', {
      style: {
        background: '#f3e8ff',
        border: '1px solid #d8b4fe',
        color: '#7c3aed'
      }
    });
    return false;
  }
};

/**
 * Proactively refreshes the session to keep it fresh
 */
export const refreshSessionProactively = async (): Promise<boolean> => {
  try {
    console.log('🔄 Proactively refreshing session...');
    
    const { data: { session }, error } = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT
    );
    
    if (error) {
      console.error('❌ Session refresh failed:', error);
      return false;
    }
    
    if (session) {
      console.log('✅ Session refreshed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Exception during session refresh:', error);
    return false;
  }
};

/**
 * Recovers session with enhanced retry logic
 */
export const recoverSession = async (retryCount = 0): Promise<any> => {
  try {
    console.log(`🔄 Attempting session recovery (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
    
    const { data: { session }, error } = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT
    );
    
    if (error) {
      console.error('❌ Session recovery failed:', error);
      
      // Retry on failure
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        console.log(`🔄 Retrying session recovery (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return recoverSession(retryCount + 1);
      }
      
      toast.error('Unable to restore session. Please login again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      return null;
    }
    
    if (session) {
      console.log('✅ Session recovered successfully');
      toast.success('Session restored successfully', {
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
    console.error('❌ Exception during session recovery:', error);
    
    // Retry on timeout or other errors
    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`🔄 Retrying session recovery after error (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return recoverSession(retryCount + 1);
    }
    
    return null;
  }
};

/**
 * Handles session expiry with comprehensive cleanup
 */
export const handleSessionExpiry = async (): Promise<any> => {
  console.log('⏰ Handling session expiry...');
  
  try {
    const recoveredSession = await recoverSession();
    
    if (!recoveredSession) {
      // Force complete logout and cleanup
      await forceCompleteLogout();
      return null;
    }
    
    return recoveredSession;
  } catch (error) {
    console.error('❌ Error handling session expiry:', error);
    await forceCompleteLogout();
    return null;
  }
};

/**
 * Forces complete logout with full cleanup
 */
export const forceCompleteLogout = async (): Promise<void> => {
  try {
    console.log('🚪 Forcing complete logout...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all Supabase-related localStorage keys
    clearSupabaseLocalStorage();
    
    // Redirect to auth page
    window.location.href = '/auth';
  } catch (error) {
    console.error('❌ Error during forced logout:', error);
    // Even if logout fails, clear storage and redirect
    clearSupabaseLocalStorage();
    window.location.href = '/auth';
  }
};

/**
 * Clears all Supabase-related localStorage keys
 */
export const clearSupabaseLocalStorage = (): void => {
  console.log('🧹 Clearing Supabase localStorage...');
  
  const keysToRemove: string[] = [];
  
  // Find all Supabase-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') || 
      key.includes('supabase') || 
      key.includes('auth-token') ||
      key.includes('access-token') ||
      key.includes('refresh-token')
    )) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all found keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed localStorage key: ${key}`);
  });
};

/**
 * Checks if Supabase localStorage keys are missing (cache cleared)
 */
export const detectCacheClearing = (): boolean => {
  const requiredKeys = [
    `sb-${supabase.supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
  ];
  
  const hasRequiredKeys = requiredKeys.some(key => {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.includes(key.split('-')[1])) {
        return true;
      }
    }
    return false;
  });
  
  if (!hasRequiredKeys) {
    console.log('🧹 Cache clearing detected - no Supabase keys found');
    return true;
  }
  
  return false;
};
