
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
        
        // Save session reference for our own use
        localStorage.setItem("booqit-session", JSON.stringify({
          user_id: session.user.id,
          expires_at: session.expires_at
        }));
        localStorage.setItem('loggedIn', 'true');
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        console.log('✅ Auth state updated successfully with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state:', error);
        // Don't clear auth state for role fetch errors, just use default
        setUserRole('customer');
      }
    } else {
      console.log('🔄 No valid session, clearing auth state');
      clearAuthState();
      localStorage.removeItem("booqit-session");
      localStorage.removeItem('loggedIn');
    }
  };

  // Initialize auth system with simplified logic
  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth system...');

      // First, check for existing session (trust localStorage)
      const { data: { session: existingSession }, error } = await supabase.auth.getSession();
      
      if (existingSession) {
        console.log('📦 Found existing session, updating auth state');
        await updateAuthState(existingSession);
      } else if (error) {
        console.error('❌ Error getting session:', error);
        clearAuthState();
      } else {
        console.log('❌ No existing session found');
        clearAuthState();
      }

      // Set up auth state change listener
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
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, updating session');
            setSession(session);
            setUser(session.user);
            // Update our stored session reference
            localStorage.setItem("booqit-session", JSON.stringify({
              user_id: session.user.id,
              expires_at: session.expires_at
            }));
          }
        }
      );

      setLoading(false);

      // Cleanup function
      return () => {
        subscription.unsubscribe();
      };

    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      clearAuthState();
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      // Add safety timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('⏰ Auth initialization timeout, stopping loading');
        setLoading(false);
      }, 5000);

      initializeAuth().then((cleanup) => {
        clearTimeout(timeout);
        return cleanup;
      });
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
      
      // Clear our own session references
      localStorage.removeItem("booqit-session");
      localStorage.removeItem('loggedIn');
      
      // Let Supabase handle clearing its own localStorage keys
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
