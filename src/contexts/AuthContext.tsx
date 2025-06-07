
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
  const authSubscription = useRef<any>(null);

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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth system...');
        
        // Set up auth state change listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('🔔 Auth state change event:', event, 'Session exists:', !!session);
            
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
            }
          }
        );

        authSubscription.current = subscription;
        
        // THEN get existing session
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            clearAuthState();
            setLoading(false);
          }
          return;
        }

        if (existingSession && mounted) {
          console.log('📦 Found existing session, updating auth state');
          await updateAuthState(existingSession);
        } else {
          console.log('❌ No existing session found');
          if (mounted) {
            clearAuthState();
          }
        }

        if (mounted) {
          setLoading(false);
          initialized.current = true;
        }

      } catch (error) {
        console.error('❌ Error during auth initialization:', error);
        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    if (!initialized.current) {
      initializeAuth();
    }

    return () => {
      mounted = false;
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
      console.log('👋 Logging out user...');
      
      // Clear auth state immediately for better UX
      clearAuthState();
      
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
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      toast.error('Logout failed. Please try again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #d8b4fe',
          color: '#7c3aed'
        }
      });
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
