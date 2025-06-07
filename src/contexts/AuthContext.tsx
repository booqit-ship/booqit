
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const sessionRecoveryAttempted = useRef(false);
  const queryClient = useQueryClient();

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
        return 'customer'; // Default fallback
      }
      
      console.log('✅ User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('❌ Exception in fetchUserRole:', error);
      return 'customer'; // Default fallback
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
        
        // Save session reference for instant restoration
        localStorage.setItem("booqit-session", JSON.stringify({
          user_id: session.user.id,
          expires_at: session.expires_at,
          access_token: session.access_token
        }));
        localStorage.setItem('loggedIn', 'true');
        
        // Fetch user role in background
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        localStorage.setItem('user-role', role || 'customer');
        
        console.log('✅ Auth state updated successfully with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state:', error);
        setUserRole('customer');
        localStorage.setItem('user-role', 'customer');
      }
    } else {
      console.log('🔄 No valid session, clearing auth state');
      clearAuthState();
      localStorage.removeItem("booqit-session");
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('user-role');
    }
  };

  // INSTANT session restoration - no network calls
  const restoreSessionInstantly = () => {
    try {
      const loggedInFlag = localStorage.getItem('loggedIn');
      const storedSession = localStorage.getItem('booqit-session');
      const cachedRole = localStorage.getItem('user-role');
      
      if (loggedInFlag && storedSession) {
        const sessionData = JSON.parse(storedSession);
        console.log('⚡ INSTANT session restoration from cache');
        
        // Set auth state immediately from cache
        setIsAuthenticated(true);
        setUserId(sessionData.user_id);
        setUserRole((cachedRole as UserRole) || 'customer');
        
        // Return true to indicate successful instant restoration
        return true;
      }
    } catch (error) {
      console.error('❌ Error during instant session restoration:', error);
    }
    return false;
  };

  // Initialize auth system with instant restoration
  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth system...');

      // STEP 1: Try instant restoration first
      const instantlyRestored = restoreSessionInstantly();
      
      // STEP 2: Set loading to false immediately - never block UI
      setLoading(false);

      // STEP 3: Verify session with Supabase in background only once
      if (instantlyRestored && !sessionRecoveryAttempted.current) {
        sessionRecoveryAttempted.current = true;
        
        setTimeout(async () => {
          try {
            const { data: { session: existingSession }, error } = await supabase.auth.getSession();
            
            if (existingSession) {
              console.log('📦 Background session verification successful');
              await updateAuthState(existingSession);
            } else if (error) {
              console.error('❌ Background session verification failed:', error);
              // Only clear state if there's a definitive error, not just missing session
              if (error.message.includes('refresh_token') || error.message.includes('expired')) {
                console.log('🔄 Session expired, clearing state');
                clearAuthState();
                localStorage.removeItem('loggedIn');
                localStorage.removeItem('user-role');
                localStorage.removeItem('booqit-session');
              }
            } else {
              console.log('❌ No Supabase session found, but keeping local state for now');
            }
          } catch (err) {
            console.error('❌ Exception during background session verification:', err);
          }
        }, 100); // Small delay to not block initial render
      } else if (!instantlyRestored) {
        // If no cached session, try to get session from Supabase once
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session) {
            await updateAuthState(session);
          } else if (error) {
            console.error('❌ Error getting initial session:', error);
          }
        } catch (error) {
          console.error('❌ Exception getting initial session:', error);
        }
      }

      // Set up auth state change listener (only once)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 Auth state change event:', event, 'Session exists:', !!session);
          
          if (event === 'SIGNED_IN' && session) {
            console.log('👤 User signed in, updating auth state');
            await updateAuthState(session);
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out, clearing auth state');
            clearAuthState();
            localStorage.removeItem("booqit-session");
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('user-role');
            queryClient.clear();
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, updating session');
            setSession(session);
            setUser(session.user);
            localStorage.setItem("booqit-session", JSON.stringify({
              user_id: session.user.id,
              expires_at: session.expires_at,
              access_token: session.access_token
            }));
          }
        }
      );

      // Cleanup function
      return () => {
        subscription.unsubscribe();
      };

    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeAuth();
    }
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // Clear auth state immediately for better UX
      clearAuthState();
      
      // Clear all caches and session references
      localStorage.removeItem("booqit-session");
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('user-role');
      queryClient.clear();
      
      // Reset session recovery flag
      sessionRecoveryAttempted.current = false;
      
      // Let Supabase handle the logout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Error during logout:', error);
        toast.error('Logout failed. Please try again.');
      } else {
        console.log('✅ Logout successful');
        toast.success('Logged out successfully');
      }
      
      // Redirect to auth page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      toast.error('Logout completed with errors');
      
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
