
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
  
  // Use refs to prevent infinite loops
  const isInitialized = useRef(false);
  const authSubscription = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setSession(session);
    
    if (session?.user) {
      console.log('User authenticated, setting up session...');
      setUser(session.user);
      setIsAuthenticated(true);
      setUserId(session.user.id);
      
      // Fetch user role
      const role = await fetchUserRole(session.user.id);
      if (role) {
        setUserRole(role);
        
        // Store minimal auth state
        const authState = {
          isAuthenticated: true,
          role,
          id: session.user.id
        };
        localStorage.setItem('booqit_auth', JSON.stringify(authState));
        console.log('Auth state stored');
      }
    } else {
      console.log('User signed out or no session');
      setUser(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('booqit_auth');
    }
    
    // Always clear loading after processing auth state
    setLoading(false);
    isInitialized.current = true;
  };

  useEffect(() => {
    // Prevent re-initialization
    if (isInitialized.current) return;
    
    console.log('Initializing auth...');
    
    // Set up auth listener only once
    authSubscription.current = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Safety timeout to ensure loading clears
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timeout - clearing loading state');
        setLoading(false);
        isInitialized.current = true;
      }
    }, 2000);

    // Cleanup function
    return () => {
      console.log('Cleaning up auth');
      if (authSubscription.current) {
        authSubscription.current.data.subscription.unsubscribe();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    if (isAuthenticated && role && id) {
      const authState = { isAuthenticated, role, id };
      localStorage.setItem('booqit_auth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('booqit_auth');
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
        toast.error('Logout failed. Please try again.');
      } else {
        console.log('Logout successful');
        toast.success('Logged out successfully');
      }
      
      // Clear auth state immediately
      setAuth(false, null, null);
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
