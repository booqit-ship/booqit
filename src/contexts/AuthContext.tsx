
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PermanentSession } from '@/utils/permanentSession';
import { InstantSessionLoader } from '@/utils/instantSessionLoader';

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
  // Pre-populate state with instantly loaded session data
  const preloadedSession = InstantSessionLoader.getPreloadedSession();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(preloadedSession?.isAuthenticated || false);
  const [userRole, setUserRole] = useState<UserRole | null>(preloadedSession?.userRole || null);
  const [userId, setUserId] = useState<string | null>(preloadedSession?.userId || null);
  const [user, setUser] = useState<User | null>(preloadedSession?.user || null);
  const [session, setSession] = useState<Session | null>(preloadedSession?.session || null);
  // Only show loading if we don't have instant session
  const [loading, setLoading] = useState<boolean>(!InstantSessionLoader.hasInstantSession());
  
  const initialized = useRef(false);
  const queryClient = useQueryClient();

  console.log('🔥 INSTANT AUTH: Context initialized with pre-loaded session:', {
    isAuthenticated,
    userRole,
    userId: !!userId,
    hasInstantSession: InstantSessionLoader.hasInstantSession()
  });

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
        return 'customer';
      }
      
      console.log('✅ User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('❌ Exception in fetchUserRole:', error);
      return 'customer';
    }
  };

  const updateAuthStateFromSupabase = async (session: Session | null) => {
    console.log('🔄 INSTANT: Updating auth state from Supabase session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        PermanentSession.saveSession(session, role || 'customer', session.user.id);
        
        console.log('✅ INSTANT: Auth state updated and saved permanently with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from Supabase:', error);
        setUserRole('customer');
        PermanentSession.saveSession(session, 'customer', session.user.id);
      }
    } else {
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        console.log('🔒 INSTANT: No Supabase session but permanent session exists - keeping user logged in');
      } else {
        console.log('🧹 INSTANT: No session anywhere - clearing auth state');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setSession(null);
        setUser(null);
      }
    }
  };

  const initializeAuth = async () => {
    try {
      console.log('🚀 INSTANT: Initializing auth system...');

      if (!initialized.current) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 INSTANT: Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('👤 INSTANT: User signed in, updating permanent session');
              await updateAuthStateFromSupabase(session);
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 INSTANT: User signed out - checking if it was manual');
              const permanentData = PermanentSession.getSession();
              if (!permanentData.isLoggedIn) {
                setIsAuthenticated(false);
                setUserRole(null);
                setUserId(null);
                setSession(null);
                setUser(null);
                queryClient.clear();
              }
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('🔄 INSTANT: Token refreshed, updating permanent session');
              const currentRole = userRole || 'customer';
              PermanentSession.saveSession(session, currentRole, session.user.id);
              setSession(session);
              setUser(session.user);
            }
          }
        );

        initialized.current = true;
        
        // Only do background check if we don't have instant session
        if (!InstantSessionLoader.hasInstantSession()) {
          setTimeout(async () => {
            try {
              console.log('📦 INSTANT: Background check for existing Supabase session');
              const { data: { session }, error } = await supabase.auth.getSession();
              
              if (session && !error) {
                console.log('📦 INSTANT: Found existing Supabase session');
                await updateAuthStateFromSupabase(session);
              }
            } catch (error) {
              console.error('❌ INSTANT: Background session check failed:', error);
            } finally {
              setLoading(false);
            }
          }, 100);
        } else {
          // We have instant session, no loading needed
          setLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      }

      console.log('⏹️ INSTANT: Auth initialization complete');
      setLoading(false);

    } catch (error) {
      console.error('❌ INSTANT: Error during auth initialization:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initializeAuth();
    }
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 INSTANT: Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 INSTANT: Manual logout initiated...');
      
      PermanentSession.clearSession();
      
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setSession(null);
      setUser(null);
      
      queryClient.clear();
      
      supabase.auth.signOut().catch(error => {
        console.error('❌ Supabase logout error (ignoring):', error);
      });
      
      console.log('✅ INSTANT: Manual logout successful');
      toast.success('Logged out successfully');
      
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ INSTANT: Exception during logout:', error);
      toast.error('Logout completed with errors');
      
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
