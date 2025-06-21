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

  // BULLETPROOF: Instant session restoration
  const instantSessionRestore = () => {
    const permanentData = PermanentSession.getSession();
    
    if (permanentData.isLoggedIn && permanentData.userId && permanentData.userRole) {
      console.log('⚡ BULLETPROOF: Instant session restore from permanent storage');
      
      setIsAuthenticated(true);
      setUserId(permanentData.userId);
      setUserRole(permanentData.userRole as UserRole);
      setSession(permanentData.session);
      setUser(permanentData.session?.user || null);
      
      return true;
    }
    return false;
  };

  const updateAuthStateFromSupabase = async (session: Session | null) => {
    console.log('🔄 BULLETPROOF: Updating auth state from Supabase session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        // Save permanently - this ensures infinite persistence
        PermanentSession.saveSession(session, role || 'customer', session.user.id);
        
        console.log('✅ BULLETPROOF: Auth state updated and saved permanently with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from Supabase:', error);
        setUserRole('customer');
        PermanentSession.saveSession(session, 'customer', session.user.id);
      }
    } else {
      // IMPORTANT: Don't clear state immediately - check permanent session first
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        console.log('🔒 BULLETPROOF: No Supabase session but permanent session exists - keeping user logged in');
        // Don't change anything - keep the permanent session active
      } else {
        console.log('🧹 BULLETPROOF: No session anywhere - clearing auth state');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setSession(null);
        setUser(null);
      }
    }
  };

  // BULLETPROOF initialization
  const initializeAuth = async () => {
    try {
      console.log('🚀 BULLETPROOF: Initializing auth system...');

      // STEP 1: Try instant restoration FIRST (no waiting)
      const instantlyRestored = instantSessionRestore();
      
      if (instantlyRestored) {
        console.log('⚡ BULLETPROOF: Session restored instantly - user should see app immediately');
        setLoading(false); // Stop loading immediately
      }
      
      // STEP 2: Set up auth listener (only once)
      if (!initialized.current) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 BULLETPROOF: Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('👤 BULLETPROOF: User signed in, updating permanent session');
              await updateAuthStateFromSupabase(session);
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 BULLETPROOF: User signed out - checking if it was manual');
              // Only clear if permanent session was also cleared (manual logout)
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
              console.log('🔄 BULLETPROOF: Token refreshed, updating permanent session');
              const currentRole = userRole || 'customer';
              PermanentSession.saveSession(session, currentRole, session.user.id);
              setSession(session);
              setUser(session.user);
            }
          }
        );

        initialized.current = true;
        
        // STEP 3: Background Supabase session check (don't wait for this)
        setTimeout(async () => {
          try {
            console.log('📦 BULLETPROOF: Background check for existing Supabase session');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (session && !error) {
              console.log('📦 BULLETPROOF: Found existing Supabase session');
              await updateAuthStateFromSupabase(session);
            }
          } catch (error) {
            console.error('❌ BULLETPROOF: Background session check failed:', error);
          }
        }, 100);

        return () => {
          subscription.unsubscribe();
        };
      }

      console.log('⏹️ BULLETPROOF: Auth initialization complete');
      if (!instantlyRestored) {
        setLoading(false);
      }

    } catch (error) {
      console.error('❌ BULLETPROOF: Error during auth initialization:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initializeAuth();
    }
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 BULLETPROOF: Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 BULLETPROOF: Manual logout initiated...');
      
      // Clear permanent session FIRST (this is the key signal)
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
      
      console.log('✅ BULLETPROOF: Manual logout successful');
      toast.success('Logged out successfully');
      
      // Redirect to auth page
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ BULLETPROOF: Exception during logout:', error);
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
