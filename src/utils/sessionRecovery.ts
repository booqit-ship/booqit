
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_RETRY_ATTEMPTS = 3;
const SESSION_TIMEOUT_MS = 8000; // Increased timeout for slower connections

// Helper function to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]);
};

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

// Clear all Supabase-related localStorage keys
export const clearSupabaseStorage = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys
      .filter(key => key.includes('supabase'))
      .forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Cleared all Supabase localStorage keys');
  } catch (error) {
    console.error('❌ Error clearing Supabase storage:', error);
  }
};

// Enhanced session validation with better error handling
export const validateCurrentSession = async (retryCount = 0): Promise<boolean> => {
  try {
    console.log(`🔍 Validating session (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    // First, check if we have a session without refreshing
    const { data: { session }, error: getSessionError } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT_MS
    );
    
    if (getSessionError && retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`⚠️ Session get failed, retrying... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return validateCurrentSession(retryCount + 1);
    }
    
    if (session) {
      // If we have a session, try to refresh it to ensure it's valid
      try {
        const refreshResult = await withTimeout(
          supabase.auth.refreshSession(),
          SESSION_TIMEOUT_MS
        );
        
        if (refreshResult.error) {
          console.warn('⚠️ Session refresh failed, but session exists:', refreshResult.error.message);
          // If refresh fails but session exists, consider it valid (might be network issue)
          return true;
        }
        
        console.log('✅ Session validated and refreshed successfully');
        return true;
      } catch (refreshError) {
        console.warn('⚠️ Session refresh threw error, but session exists:', refreshError);
        // If refresh throws but session exists, consider it valid
        return true;
      }
    }
    
    console.log('❌ No active session found');
    return false;
  } catch (error) {
    console.error('❌ Exception during session validation:', error);
    
    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`🔄 Retrying after error... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return validateCurrentSession(retryCount + 1);
    }
    
    return false;
  }
};

// Enhanced session recovery with better error handling
export const recoverSession = async () => {
  try {
    console.log('🔄 Attempting session recovery with refresh...');
    
    const { data: { session }, error } = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT_MS
    );
    
    if (error) {
      console.error('❌ Session recovery failed:', error);
      
      // Check if it's a network error vs auth error
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        console.log('🌐 Network-related error, might recover later');
        return null;
      }
      
      return null;
    }
    
    if (session) {
      console.log('✅ Session recovered successfully');
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Exception during session recovery:', error);
    
    // Check if it's a network error
    if (error.message?.includes('timeout') || error.message?.includes('network')) {
      console.log('🌐 Network-related exception, might recover later');
    }
    
    return null;
  }
};

// Enhanced session expiry handling with user feedback
export const handleSessionExpiry = async () => {
  console.log('⏰ Handling session expiry...');
  
  try {
    const recoveredSession = await recoverSession();
    
    if (!recoveredSession) {
      console.log('🚪 No session recovery possible, clearing auth state');
      
      // Don't clear storage immediately - give user a chance to refresh manually
      // clearSupabaseStorage();
      
      return null;
    }
    
    return recoveredSession;
  } catch (error) {
    console.error('❌ Error handling session expiry:', error);
    
    // Only clear storage if it's definitely an auth error, not network
    if (!error.message?.includes('network') && !error.message?.includes('timeout')) {
      clearSupabaseStorage();
    }
    
    return null;
  }
};
