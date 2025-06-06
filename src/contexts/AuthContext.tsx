
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
  
  // Use refs to prevent infinite loops and track initialization
  const isInitialized = useRef(false);
  const authSubscription = useRef<any>(null);
  const currentSessionId = useRef<string | null>(null);

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    currentSessionId.current = null;
    localStorage.removeItem('booqit_auth');
  };

  const fetchUserRole = async (userId: string) => {
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
    console.log('Auth state change event:', event, 'Session exists:', !!session);
    
    // If we have a session
    if (session?.user) {
      const newSessionId = session.access_token;
      
      // Check if this is a different session than what we currently have
      if (currentSessionId.current && currentSessionId.current !== newSessionId) {
        console.log('New session detected, clearing old auth state');
        clearAuthState();
      }
      
      console.log('User authenticated, setting up session...');
      currentSessionId.current = newSessionId;
      setSession(session);
      setUser(session.user);
      setIsAuthenticated(true);
      setUserId(session.user.id);
      
      // Fetch user role
      const role = await fetchUserRole(session.user.id);
      if (role) {
        setUserRole(role);
        
        // Store minimal auth state with session identifier
        const authState = {
          isAuthenticated: true,
          role,
          id: session.user.id,
          sessionId: newSessionId
        };
        localStorage.setItem('booqit_auth', JSON.stringify(authState));
        console.log('Auth state stored with new session');
      }
    } else {
      console.log('User signed out or no session');
      clearAuthState();
    }
    
    // Always clear loading after processing auth state
    setLoading(false);
    isInitialized.current = true;
  };

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized.current) return;
    
    console.log('Initializing auth...');
    
    // Check for existing session first
    const checkExistingSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('Found existing session');
          // Check if localStorage has conflicting data
          const storedAuth = localStorage.getItem('booqit_auth');
          if (storedAuth) {
            try {
              const parsedAuth = JSON.parse(storedAuth);
              const storedSessionId = parsedAuth.sessionId;
              const currentSessionId = existingSession.access_token;
              
              if (storedSessionId && storedSessionId !== currentSessionId) {
                console.log('Session mismatch detected, clearing stale data');
                localStorage.removeItem('booqit_auth');
              }
            } catch (e) {
              console.log('Invalid stored auth data, clearing');
              localStorage.removeItem('booqit_auth');
            }
          }
          
          // Process the existing session
          await handleAuthStateChange('SIGNED_IN', existingSession);
        } else {
          console.log('No existing session found');
          setLoading(false);
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        clearAuthState();
        setLoading(false);
        isInitialized.current = true;
      }
    };

    // Set up auth listener
    authSubscription.current = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check existing session
    checkExistingSession();

    // Safety timeout to ensure loading clears
    const timeoutId = setTimeout(() => {
      if (loading && !isInitialized.current) {
        console.warn('Auth initialization timeout - clearing loading state');
        setLoading(false);
        isInitialized.current = true;
      }
    }, 3000);

    // Cleanup function
    return () => {
      console.log('Cleaning up auth');
      if (authSubscription.current) {
        authSubscription.current.data.subscription.unsubscribe();
      }
      clearTimeout(timeoutId);
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
        sessionId: currentSessionId.current 
      };
      localStorage.setItem('booqit_auth', JSON.stringify(authState));
    } else {
      clearAuthState();
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear auth state immediately to prevent UI delays
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
