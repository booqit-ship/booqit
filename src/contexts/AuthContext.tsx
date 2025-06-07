
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { hasSupabaseTokens, clearSupabaseStorage } from '@/utils/sessionRecovery';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const initialized = useRef(false);
  const authSubscription = useRef<any>(null);
  const initializationTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionRecoveryAttempted = useRef(false);

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
          console.warn('⚠️ Could not fetch user role, but keeping session active');
          // Don't clear auth state just because role fetch failed
          setUserRole('customer'); // Default fallback
        }
      } catch (error) {
        console.error('❌ Error updating auth state:', error);
        // Only clear auth state if it's a critical error
        if (error.message?.includes('JWT') || error.message?.includes('unauthorized')) {
          clearAuthState();
        }
      }
    } else {
      console.log('🔄 No valid session, clearing auth state');
      clearAuthState();
    }
  };

  // Enhanced session recovery function
  const attemptSessionRecovery = async (): Promise<boolean> => {
    if (sessionRecoveryAttempted.current) {
      return false;
    }

    sessionRecoveryAttempted.current = true;
    console.log('🔄 Attempting session recovery...');

    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (data?.session && !error) {
        console.log('✅ Session recovered successfully');
        await updateAuthState(data.session);
        return true;
      } else {
        console.log('❌ Session recovery failed:', error?.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Exception during session recovery:', error);
      return false;
    }
  };

  // Enhanced initialization with better error handling
  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth system...');

      // Set up auth state change listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 Auth state change event:', event, 'Session exists:', !!session);
          
          try {
            if (event === 'SIGNED_IN' && session) {
              console.log('👤 User signed in, updating auth state');
              sessionRecoveryAttempted.current = false; // Reset recovery flag
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
          }
        }
      );

      authSubscription.current = subscription;

      // Set timeout for initialization (7 seconds max for slower connections)
      initializationTimeout.current = setTimeout(() => {
        console.warn('⏰ Auth initialization timeout');
        if (!hasSupabaseTokens() && !sessionRecoveryAttempted.current) {
          console.log('🔄 Timeout reached, attempting session recovery...');
          attemptSessionRecovery().then((recovered) => {
            if (!recovered) {
              clearAuthState();
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }, 7000);

      // Get existing session with timeout and recovery
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const { data: { session: existingSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        // Clear the timeout since we got a response
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
          initializationTimeout.current = null;
        }

        if (error) {
          console.error('❌ Error getting session:', error);
          
          // Try session recovery before giving up
          const recovered = await attemptSessionRecovery();
          if (!recovered && !hasSupabaseTokens()) {
            clearAuthState();
          }
          setLoading(false);
          return;
        }

        if (existingSession) {
          console.log('📦 Found existing session, updating auth state');
          await updateAuthState(existingSession);
        } else {
          console.log('❌ No existing session found');
          
          // If no session but tokens might exist, try recovery
          if (hasSupabaseTokens()) {
            const recovered = await attemptSessionRecovery();
            if (!recovered) {
              clearAuthState();
            }
          } else {
            clearAuthState();
          }
        }

        setLoading(false);

      } catch (error) {
        console.error('❌ Session fetch failed or timed out:', error);
        
        // Clear timeout if it exists
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
          initializationTimeout.current = null;
        }

        // Try recovery before clearing auth state
        const recovered = await attemptSessionRecovery();
        if (!recovered && !hasSupabaseTokens()) {
          clearAuthState();
        }
        setLoading(false);
      }

    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
        initializationTimeout.current = null;
      }
      
      // Try recovery as last resort
      const recovered = await attemptSessionRecovery();
      if (!recovered) {
        clearAuthState();
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeAuth();
    }

    return () => {
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
      }
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    // Reset recovery flag when auth is set manually
    sessionRecoveryAttempted.current = false;
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // Clear auth state immediately for better UX
      clearAuthState();
      
      // Clear all Supabase localStorage keys
      clearSupabaseStorage();
      
      // Reset recovery flag
      sessionRecoveryAttempted.current = false;
      
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
      
      // Force redirect to ensure clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      clearSupabaseStorage();
      clearAuthState();
      
      toast.error('Logout completed with errors', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
      
      // Force redirect even on error
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
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
