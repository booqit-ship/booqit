
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
  const sessionCache = useRef<Session | null>(null);
  const lastSessionCheck = useRef<number>(0);
  const SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    sessionCache.current = null;
    lastSessionCheck.current = 0;
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

  const setAuthState = (session: Session | null) => {
    if (session?.user) {
      sessionCache.current = session;
      lastSessionCheck.current = Date.now();
      setSession(session);
      setUser(session.user);
      setIsAuthenticated(true);
      setUserId(session.user.id);
    } else {
      clearAuthState();
    }
  };

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state change event:', event, 'Session exists:', !!session);
    
    try {
      if (session?.user) {
        console.log('Processing authenticated session...');
        
        // Check if we already have this session cached
        if (sessionCache.current?.access_token === session.access_token && userRole) {
          console.log('Using cached session and role');
          setAuthState(session);
          setUserRole(userRole);
          setLoading(false);
          return;
        }
        
        setAuthState(session);
        
        // Fetch user role only if we don't have it or session changed
        const role = await fetchUserRole(session.user.id);
        if (role) {
          setUserRole(role);
          
          // Store auth state with session identifier
          const authState = {
            isAuthenticated: true,
            role,
            id: session.user.id,
            sessionId: session.access_token,
            timestamp: Date.now()
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
    
    setLoading(false);
    isInitialized.current = true;
  };

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized.current) return;
    
    console.log('Initializing auth system...');
    
    const initializeAuth = async () => {
      try {
        // Check for cached auth state first
        const storedAuth = localStorage.getItem('booqit_auth');
        if (storedAuth) {
          try {
            const parsedAuth = JSON.parse(storedAuth);
            const now = Date.now();
            const isRecent = parsedAuth.timestamp && (now - parsedAuth.timestamp) < SESSION_CACHE_DURATION;
            
            if (isRecent && parsedAuth.isAuthenticated && parsedAuth.role && parsedAuth.id) {
              console.log('Using cached auth state');
              setIsAuthenticated(true);
              setUserRole(parsedAuth.role);
              setUserId(parsedAuth.id);
              lastSessionCheck.current = now;
            }
          } catch (e) {
            console.log('Invalid stored auth data, clearing');
            localStorage.removeItem('booqit_auth');
          }
        }

        // Set up auth listener
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

    initializeAuth();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading && !isInitialized.current) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
        isInitialized.current = true;
      }
    }, 3000); // Reduced from 5 seconds

    // Cleanup function
    return () => {
      clearTimeout(safetyTimeout);
      if (authSubscription.current) {
        authSubscription.current.data.subscription.unsubscribe();
        authSubscription.current = null;
      }
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
        sessionId: session?.access_token || null,
        timestamp: Date.now()
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
