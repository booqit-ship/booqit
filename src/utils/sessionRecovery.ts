
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_RETRY_ATTEMPTS = 3;
const SESSION_TIMEOUT_MS = 5000;

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

// Validate current session with timeout and retry logic
export const validateCurrentSession = async (retryCount = 0): Promise<boolean> => {
  try {
    console.log(`🔍 Validating session (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    // First, try to refresh the session to ensure it's current
    const refreshResult = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT_MS
    );
    
    if (refreshResult.error && retryCount < MAX_RETRY_ATTEMPTS - 1) {
      console.log(`⚠️ Session refresh failed, retrying... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return validateCurrentSession(retryCount + 1);
    }
    
    // Then validate the session
    const { data: { session }, error } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT_MS
    );
    
    if (error) {
      console.error('❌ Session validation failed:', error);
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        console.log(`🔄 Retrying session validation... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return validateCurrentSession(retryCount + 1);
      }
      return false;
    }
    
    if (session) {
      console.log('✅ Session validated successfully');
      return true;
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

// Recover session with proactive refresh
export const recoverSession = async () => {
  try {
    console.log('🔄 Attempting session recovery with refresh...');
    
    const { data: { session }, error } = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT_MS
    );
    
    if (error) {
      console.error('❌ Session recovery failed:', error);
      return null;
    }
    
    if (session) {
      console.log('✅ Session recovered successfully');
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Exception during session recovery:', error);
    return null;
  }
};

// Handle session expiry with proper cleanup
export const handleSessionExpiry = async () => {
  console.log('⏰ Handling session expiry...');
  
  try {
    const recoveredSession = await recoverSession();
    
    if (!recoveredSession) {
      console.log('🚪 No session recovery possible, clearing auth state');
      clearSupabaseStorage();
      return null;
    }
    
    return recoveredSession;
  } catch (error) {
    console.error('❌ Error handling session expiry:', error);
    clearSupabaseStorage();
    return null;
  }
};
