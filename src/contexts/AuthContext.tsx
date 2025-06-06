
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
  
  // Use refs to prevent issues and track state
  const isInitialized = useRef(false);
  const authSubscription = useRef<any>(null);
  const initializationPromise = useRef<Promise<void> | null>(null);
  const cleanupTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Cleanup function
  const cleanup = () => {
    cleanupTimeouts.current.forEach(timeout => clearTimeout(timeout));
    cleanupTimeouts.current = [];
  };

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    localStorage.removeItem('booqit_auth');
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

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    // Prevent concurrent auth state changes
    if (initializationPromise.current) {
      await initializationPromise.current;
    }

    console.log('Auth state change event:', event, 'Session exists:', !!session);
    
    try {
      if (session?.user) {
        console.log('Processing authenticated session...');
        
        // Clear any existing conflicting auth data
        const storedAuth = localStorage.getItem('booqit_auth');
        if (storedAuth) {
          try {
            const parsedAuth = JSON.parse(storedAuth);
            const storedSessionId = parsedAuth.sessionId;
            const currentSessionId = session.access_token;
            
            if (storedSessionId && storedSessionId !== currentSessionId) {
              console.log('Session mismatch detected, clearing old data');
              localStorage.removeItem('booqit_auth');
            }
          } catch (e) {
            console.log('Invalid stored auth data, clearing');
            localStorage.removeItem('booqit_auth');
          }
        }
        
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        if (role) {
          setUserRole(role);
          
          // Store auth state with session identifier
          const authState = {
            isAuthenticated: true,
            role,
            id: session.user.id,
            sessionId: session.access_token
          };
          localStorage.setItem('booqit_auth', JSON.stringify(authState));
          console.log('Auth state updated successfully');
        } else {
          console.error('Failed to fetch user role');
          clearAuthState();
        }
      } else {
        console.log('No session, clearing auth state');
        clearAuthState();
      }
    } catch (error) {
      console.error('Error in handleAuthStateChange:', error);
      clearAuthState();
    }
    
    // Always ensure loading is cleared
    setLoading(false);
    isInitialized.current = true;
  };

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized.current) return;
    
    console.log('Initializing auth system...');
    
    const initializeAuth = async () => {
      try {
        // Set up auth listener first
        if (authSubscription.current) {
          authSubscription.current.data.subscription.unsubscribe();
        }
        authSubscription.current = supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Check for existing session
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          clearAuthState();
          setLoading(false);
          isInitialized.current = true;
          return;
        }

        if (existingSession) {
          console.log('Found existing session, processing...');
          await handleAuthStateChange('SIGNED_IN', existingSession);
        } else {
          console.log('No existing session found');
          clearAuthState();
          setLoading(false);
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        clearAuthState();
        setLoading(false);
        isInitialized.current = true;
      }
    };

    // Store initialization promise to prevent concurrent calls
    initializationPromise.current = initializeAuth();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading && !isInitialized.current) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
        isInitialized.current = true;
      }
    }, 5000);
    
    cleanupTimeouts.current.push(safetyTimeout);

    // Cleanup function
    return () => {
      console.log('Cleaning up auth provider');
      cleanup();
      if (authSubscription.current) {
        authSubscription.current.data.subscription.unsubscribe();
        authSubscription.current = null;
      }
      initializationPromise.current = null;
    };
  }, []); // Empty dependency array - only run once

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    if (isAuthenticated && role && id) {
      const authState = { 
        isAuthenticated, 
        role, 
        id,
        sessionId: session?.access_token || null
      };
      localStorage.setItem('booqit_auth', JSON.stringify(authState));
    } else {
      clearAuthState();
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear auth state immediately
      clearAuthState();
      setLoading(false);
      
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
