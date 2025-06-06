
import { supabase } from '@/integrations/supabase/client';

export const debugAuthState = async () => {
  console.group('🔍 Auth Debug Information');
  
  try {
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Session Data:', sessionData);
    console.log('Session Error:', sessionError);
    
    // Check user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('User Data:', userData);
    console.log('User Error:', userError);
    
    // Check localStorage
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) {
        localStorageKeys.push({
          key,
          value: localStorage.getItem(key)
        });
      }
    }
    console.log('Supabase LocalStorage:', localStorageKeys);
    
    // Connection test
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    console.log('Connection Test:', { testData, testError });
    
  } catch (error) {
    console.error('Debug Error:', error);
  }
  
  console.groupEnd();
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuthState;
}
