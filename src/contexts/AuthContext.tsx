
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
  };

  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    try {
      console.log('Fetching user role for userId:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      console.log('User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('Exception in fetchUserRole:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Initializing auth system...');
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            clearAuthState();
            setLoading(false);
          }
          return;
        }

        if (existingSession?.user && mounted) {
          console.log('Found existing session, processing...');
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAuthenticated(true);
          setUserId(existingSession.user.id);
          
          // Fetch user role
          const role = await fetchUserRole(existingSession.user.id);
          if (role && mounted) {
            setUserRole(role);
            console.log('Auth state updated successfully');
          }
        }

        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('Auth state change event:', event, 'Session exists:', !!session);
            
            if (session?.user) {
              console.log('Processing authenticated session...');
              
              setSession(session);
              setUser(session.user);
              setIsAuthenticated(true);
              setUserId(session.user.id);
              
              // Fetch user role
              const role = await fetchUserRole(session.user.id);
              if (role && mounted) {
                setUserRole(role);
                console.log('Auth state updated successfully');
              }
            } else {
              console.log('No session, clearing auth state');
              clearAuthState();
            }
          }
        );

        // Always set loading to false after initialization
        if (mounted) {
          setLoading(false);
        }

        // Cleanup function
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    const cleanup = initializeAuth();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 5000); // Reduced to 5 seconds

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      cleanup?.then?.(cb => cb?.());
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear auth state immediately
      clearAuthState();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
        toast.error('Logout failed. Please try again.');
      } else {
        console.log('Logout successful');
        toast.success('Logged out successfully');
      }
    } catch (error) {
      console.error('Exception during logout:', error);
      toast.error('Logout failed. Please try again.');
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
