
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { detectCacheClearing, clearSupabaseLocalStorage } from '@/utils/sessionRecovery';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  setAuth: (isAuthenticated: boolean, role: UserRole | null, id: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Timeout for auth initialization (5 seconds)
 */
const AUTH_INIT_TIMEOUT = 5000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const initialized = useRef(false);
  const authSubscription = useRef<any>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAuthState = () => {
    console.log('🔄 Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
  };

  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    try {
      console.log('🔍 Fetching user role for userId:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching user role:', error);
        return null;
      }
      
      console.log('✅ User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('❌ Exception in fetchUserRole:', error);
      return null;
    }
  };

  const updateAuthState = async (session: Session | null) => {
    console.log('🔄 Updating auth state with session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        if (role) {
          setUserRole(role);
          console.log('✅ Auth state updated successfully with role:', role);
        } else {
          console.warn('⚠️ Could not fetch user role, clearing auth state');
          clearAuthState();
        }
      } catch (error) {
        console.error('❌ Error updating auth state:', error);
        clearAuthState();
      }
    } else {
      console.log('🔄 No valid session, clearing auth state');
      clearAuthState();
    }
  };

  /**
   * Initialize auth with timeout protection
   */
  const initializeAuthWithTimeout = async () => {
    try {
      console.log('🚀 Initializing auth system with timeout protection...');
      
      // Set up a timeout to prevent infinite loading
      initTimeoutRef.current = setTimeout(() => {
        console.error('⏰ Auth initialization timed out after 5 seconds');
        clearAuthState();
        setLoading(false);
        
        // Check if cache was cleared
        if (detectCacheClearing()) {
          console.log('🧹 Cache clearing detected, redirecting to auth...');
          window.location.href = '/auth';
        }
      }, AUTH_INIT_TIMEOUT);

      // Check for cache clearing before attempting session operations
      if (detectCacheClearing()) {
        console.log('🧹 Cache clearing detected during init, redirecting to auth...');
        clearAuthState();
        setLoading(false);
        window.location.href = '/auth';
        return;
      }

      // Set up auth state change listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 Auth state change event:', event, 'Session exists:', !!session);
          
          // Clear timeout since we got a response
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          
          try {
            if (event === 'SIGNED_IN' && session) {
              console.log('👤 User signed in, updating auth state');
              await updateAuthState(session);
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 User signed out, clearing auth state');
              clearAuthState();
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('🔄 Token refreshed, updating session');
              setSession(session);
              setUser(session.user);
            } else if (event === 'INITIAL_SESSION' && session) {
              console.log('🎯 Initial session detected');
              await updateAuthState(session);
            }
          } catch (error) {
            console.error('❌ Error handling auth state change:', error);
            toast.error('Authentication error occurred', {
              style: {
                background: '#f3e8ff',
                border: '1px solid #d8b4fe',
                color: '#7c3aed'
              }
            });
            clearAuthState();
          } finally {
            setLoading(false);
          }
        }
      );

      authSubscription.current = subscription;
      
      // THEN get existing session with timeout protection
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session retrieval timed out')), AUTH_INIT_TIMEOUT - 1000);
      });

      try {
        const { data: { session: existingSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        // Clear timeout since we got a response
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
        if (error) {
          console.error('❌ Error getting session:', error);
          clearAuthState();
          setLoading(false);
          return;
        }

        if (existingSession) {
          console.log('📦 Found existing session, updating auth state');
          await updateAuthState(existingSession);
        } else {
          console.log('❌ No existing session found');
          clearAuthState();
        }

        setLoading(false);
        initialized.current = true;

      } catch (sessionError) {
        console.error('❌ Session retrieval failed or timed out:', sessionError);
        
        // Clear timeout
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
        clearAuthState();
        setLoading(false);
        
        // If session retrieval fails, check for cache clearing
        if (detectCacheClearing()) {
          console.log('🧹 Session failed + cache cleared, redirecting to auth...');
          window.location.href = '/auth';
        }
      }

    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      
      // Clear timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      clearAuthState();
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!initialized.current && mounted) {
      initializeAuthWithTimeout();
    }

    return () => {
      mounted = false;
      
      // Cleanup timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      // Cleanup subscription
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user with complete cleanup...');
      
      // Clear auth state immediately for better UX
      clearAuthState();
      
      // Clear all Supabase localStorage keys
      clearSupabaseLocalStorage();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Error during logout:', error);
        toast.error('Logout failed. Please try again.', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #d8b4fe',
            color: '#7c3aed'
          }
        });
      } else {
        console.log('✅ Logout successful');
        toast.success('Logged out successfully', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #d8b4fe',
            color: '#7c3aed'
          }
        });
      }
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      
      // Even if logout fails, clear everything and redirect
      clearSupabaseLocalStorage();
      clearAuthState();
      
      toast.error('Logout completed with cleanup', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      
      window.location.href = '/auth';
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    userRole,
    userId,
    user,
    session,
    loading,
    setAuth,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
