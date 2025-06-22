
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PermanentSession } from '@/utils/permanentSession';
import { UserRole } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useOptimizedAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize with permanent session if available
    const permanentData = PermanentSession.getSession();
    return {
      user: permanentData.session?.user || null,
      session: permanentData.session || null,
      userRole: permanentData.userRole as UserRole || null,
      isAuthenticated: permanentData.isLoggedIn,
      loading: !permanentData.isLoggedIn
    };
  });

  const updateAuthState = useCallback((session: Session | null) => {
    const user = session?.user || null;
    const isAuthenticated = !!session;
    
    setAuthState(prevState => ({
      ...prevState,
      user,
      session,
      isAuthenticated,
      loading: false
    }));

    // Update permanent session
    if (session) {
      PermanentSession.saveSession(session, authState.userRole || 'customer', user!.id);
    } else {
      PermanentSession.clearSession();
    }
  }, [authState.userRole]);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      const role = (profile?.role as UserRole) || 'customer';
      
      setAuthState(prev => ({ ...prev, userRole: role }));
      
      // Update permanent session with role
      const permanentData = PermanentSession.getSession();
      if (permanentData.isLoggedIn && permanentData.session) {
        PermanentSession.saveSession(permanentData.session, role, userId);
      }
      
      return role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'customer';
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        updateAuthState(session);

        // Fetch user role for new sessions
        if (session?.user && !authState.userRole) {
          setTimeout(() => {
            if (mounted) {
              fetchUserRole(session.user.id);
            }
          }, 0);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          updateAuthState(session);
          
          if (session?.user && !authState.userRole) {
            await fetchUserRole(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState, fetchUserRole, authState.userRole]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      PermanentSession.clearSession();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  return {
    ...authState,
    signOut,
    refreshRole: () => authState.user ? fetchUserRole(authState.user.id) : Promise.resolve('customer')
  };
};
