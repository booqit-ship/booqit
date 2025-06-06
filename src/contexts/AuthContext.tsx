
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
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Store session info in localStorage for persistence
  const storeSessionData = (session: Session | null, role: UserRole | null) => {
    if (session && role) {
      localStorage.setItem('booqit-session-data', JSON.stringify({
        userId: session.user.id,
        userRole: role,
        sessionExpiry: session.expires_at,
        lastActivity: Date.now()
      }));
    } else {
      localStorage.removeItem('booqit-session-data');
    }
  };

  // Retrieve session data from localStorage
  const getStoredSessionData = () => {
    try {
      const stored = localStorage.getItem('booqit-session-data');
      if (stored) {
        const data = JSON.parse(stored);
        // Check if session hasn't expired
        if (data.sessionExpiry && data.sessionExpiry * 1000 > Date.now()) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Error reading stored session data:', error);
    }
    return null;
  };

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    localStorage.removeItem('booqit-session-data');
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

  const updateAuthState = async (session: Session | null, skipRoleFetch = false) => {
    console.log('Updating auth state with session:', !!session);
    
    if (session?.user) {
      setSession(session);
      setUser(session.user);
      setIsAuthenticated(true);
      setUserId(session.user.id);
      
      let role: UserRole | null = null;
      
      // Try to get role from stored data first to avoid unnecessary API calls
      if (skipRoleFetch) {
        const storedData = getStoredSessionData();
        if (storedData && storedData.userId === session.user.id) {
          role = storedData.userRole;
          setUserRole(role);
          console.log('Using cached role:', role);
        }
      }
      
      // Fetch role if not available from cache
      if (!role) {
        role = await fetchUserRole(session.user.id);
        if (role) {
          setUserRole(role);
          console.log('Auth state updated successfully with role:', role);
        } else {
          console.warn('Could not fetch user role, clearing auth state');
          clearAuthState();
          return;
        }
      }
      
      // Store session data for persistence
      storeSessionData(session, role);
      
    } else {
      console.log('No valid session, clearing auth state');
      clearAuthState();
    }
  };

  // Check for session validity periodically
  const validateSession = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error:', error);
        clearAuthState();
        return;
      }
      
      if (currentSession) {
        // Update last activity
        const storedData = getStoredSessionData();
        if (storedData) {
          storedData.lastActivity = Date.now();
          localStorage.setItem('booqit-session-data', JSON.stringify(storedData));
        }
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('Session validation exception:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth system...');
        
        // First, check if we have stored session data
        const storedData = getStoredSessionData();
        console.log('Stored session data:', !!storedData);
        
        // Set up auth state change listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log('Auth state change event:', event, 'Session exists:', !!session);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('User signed in, updating auth state');
              await updateAuthState(session);
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out, clearing auth state');
              clearAuthState();
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('Token refreshed, updating session');
              setSession(session);
              setUser(session.user);
              // Update stored session data with new expiry
              const storedData = getStoredSessionData();
              if (storedData) {
                storeSessionData(session, storedData.userRole);
              }
            } else if (event === 'INITIAL_SESSION' && session) {
              console.log('Initial session detected');
              await updateAuthState(session, true); // Skip role fetch for initial session
            }
          }
        );

        // Then get existing session
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            clearAuthState();
            setLoading(false);
          }
          return;
        }

        if (existingSession && mounted) {
          console.log('Found existing session, updating auth state');
          await updateAuthState(existingSession, true); // Use cached role for faster loading
        } else if (storedData && mounted) {
          // If we have stored data but no session, try to refresh
          console.log('No session but have stored data, attempting refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshedSession && mounted) {
            console.log('Session refreshed successfully');
            await updateAuthState(refreshedSession);
          } else {
            console.log('Could not refresh session, clearing stored data');
            clearAuthState();
          }
        } else {
          console.log('No existing session or stored data found');
          if (mounted) {
            clearAuthState();
          }
        }

        if (mounted) {
          setLoading(false);
          initialized.current = true;
          
          // Set up periodic session validation
          sessionCheckInterval.current = setInterval(validateSession, 5 * 60 * 1000); // Every 5 minutes
        }

        return () => {
          subscription.unsubscribe();
          if (sessionCheckInterval.current) {
            clearInterval(sessionCheckInterval.current);
          }
        };
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          clearAuthState();
          setLoading(false);
        }
      }
    };

    if (!initialized.current) {
      initializeAuth();
    }

    // Handle visibility change to refresh session when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
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
      
      // Clear auth state immediately for better UX
      clearAuthState();
      
      // Clear the session check interval
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
      
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
