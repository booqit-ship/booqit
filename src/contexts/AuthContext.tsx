
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PermanentSession } from '@/utils/permanentSession';

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
  const queryClient = useQueryClient();

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

  const updateAuthStateFromSupabase = async (session: Session | null) => {
    console.log('🔄 Updating auth state from Supabase session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        // Save permanently
        PermanentSession.saveSession(session, role || 'customer', session.user.id);
        
        console.log('✅ Auth state updated from Supabase with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from Supabase:', error);
        setUserRole('customer');
        PermanentSession.saveSession(session, 'customer', session.user.id);
      }
    } else {
      console.log('🔄 No Supabase session, checking permanent session');
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        // Use permanent session even if Supabase session is gone
        setIsAuthenticated(true);
        setUserId(permanentData.userId);
        setUserRole(permanentData.userRole as UserRole);
        setSession(permanentData.session);
        setUser(permanentData.session?.user || null);
        console.log('✅ Using permanent session instead of Supabase');
      } else {
        // Clear everything
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setSession(null);
        setUser(null);
      }
    }
  };

  // INSTANT session restoration from permanent cache
  const restoreSessionInstantly = () => {
    try {
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        console.log('⚡ INSTANT session restoration from permanent cache');
        
        setIsAuthenticated(true);
        setUserId(permanentData.userId);
        setUserRole(permanentData.userRole as UserRole);
        setSession(permanentData.session);
        setUser(permanentData.session?.user || null);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error during instant session restoration:', error);
    }
    return false;
  };

  // Initialize auth system - NEVER validate, only restore from cache
  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth system...');

      // STEP 1: Try instant restoration from permanent cache
      const instantlyRestored = restoreSessionInstantly();
      
      // STEP 2: Set loading to false IMMEDIATELY - never block UI
      setLoading(false);

      // STEP 3: Only set up auth listener for new logins (not validation)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 Auth state change event:', event);
          
          if (event === 'SIGNED_IN' && session) {
            console.log('👤 User signed in, updating permanent session');
            await updateAuthStateFromSupabase(session);
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            setIsAuthenticated(false);
            setUserRole(null);
            setUserId(null);
            setSession(null);
            setUser(null);
            PermanentSession.clearSession();
            queryClient.clear();
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, updating permanent session');
            const currentRole = userRole || 'customer';
            PermanentSession.saveSession(session, currentRole, session.user.id);
            setSession(session);
            setUser(session.user);
          }
        }
      );

      // STEP 4: If no cached session, try to get one from Supabase ONCE only
      if (!instantlyRestored) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && !error) {
            console.log('📦 Got fresh session from Supabase');
            await updateAuthStateFromSupabase(session);
          }
        } catch (error) {
          console.error('❌ Failed to get fresh session:', error);
        }
      }

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
      
      // Clear permanent session first
      PermanentSession.clearSession();
      
      // Clear auth state immediately
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setSession(null);
      setUser(null);
      
      // Clear all caches
      queryClient.clear();
      
      // Let Supabase handle the logout (but don't wait for it)
      supabase.auth.signOut().catch(error => {
        console.error('❌ Supabase logout error (ignoring):', error);
      });
      
      console.log('✅ Logout successful');
      toast.success('Logged out successfully');
      
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
