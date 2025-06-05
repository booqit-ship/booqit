
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
    console.log('Auth state change event:', event, 'Session:', !!session);
    
    setSession(session);
    
    if (session && session.user) {
      console.log('User authenticated, setting up session...');
      setUser(session.user);
      setIsAuthenticated(true);
      setUserId(session.user.id);
      
      // Fetch user role
      const role = await fetchUserRole(session.user.id);
      if (role) {
        setUserRole(role);
        
        // Store auth state in localStorage for persistence
        const authState = {
          isAuthenticated: true,
          role,
          id: session.user.id
        };
        localStorage.setItem('booqit_auth', JSON.stringify(authState));
        console.log('Auth state stored in localStorage:', authState);
      } else {
        console.warn('Could not fetch user role, user may need to complete profile');
        // Don't show error immediately on startup, just log it
        if (event !== 'INITIAL_SESSION') {
          toast.error('Could not fetch user profile. Please try logging in again.', {
            style: {
              background: '#f3e8ff',
              border: '1px solid #a855f7',
              color: '#7c3aed'
            }
          });
        }
      }
    } else {
      console.log('User signed out or no session');
      // Clear all authentication state
      setUser(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      localStorage.removeItem('booqit_auth');
    }
    
    // Always clear loading state after handling auth change
    setLoading(false);
  };

  useEffect(() => {
    console.log('Setting up auth state management...');
    
    let initialized = false;
    
    // Set up authentication state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialized && event === 'INITIAL_SESSION') {
        initialized = true;
        console.log('Processing initial session...');
        await handleAuthStateChange(event, session);
      } else if (initialized) {
        console.log('Processing auth state change:', event);
        await handleAuthStateChange(event, session);
      }
    });

    // Set a timeout to ensure loading doesn't get stuck
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timed out, clearing loading state');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []); // Remove loading dependency to prevent re-initialization

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    if (isAuthenticated && role && id) {
      const authState = { isAuthenticated, role, id };
      localStorage.setItem('booqit_auth', JSON.stringify(authState));
      console.log('Auth state manually stored:', authState);
    } else {
      localStorage.removeItem('booqit_auth');
      console.log('Auth state cleared from localStorage');
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
        toast.error('Logout failed. Please try again.', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #a855f7',
            color: '#7c3aed'
          }
        });
      } else {
        console.log('Logout successful');
        toast.success('Logged out successfully', {
          style: {
            background: '#f3e8ff',
            border: '1px solid #a855f7',
            color: '#7c3aed'
          }
        });
      }
      
      // Clear auth state (this will be handled by onAuthStateChange too)
      setAuth(false, null, null);
    } catch (error) {
      console.error('Exception during logout:', error);
      toast.error('Logout failed. Please try again.', {
        style: {
          background: '#f3e8ff',
          border: '1px solid #a855f7',
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
