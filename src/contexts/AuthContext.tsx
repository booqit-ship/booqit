
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  setAuth: (isAuthenticated: boolean, role: UserRole | null, id: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    // Configure Supabase client for persistent sessions
    const initializeAuth = async () => {
      try {
        // First, check for existing session
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (existingSession && existingSession.user) {
          console.log('Found existing session:', existingSession.user.id);
          setSession(existingSession);
          setIsAuthenticated(true);
          setUserId(existingSession.user.id);
          
          // Fetch user role from profiles table
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', existingSession.user.id)
              .single();
            
            if (profileData) {
              setUserRole(profileData.role as UserRole);
              // Store in localStorage for faster access
              localStorage.setItem('booqit_auth', JSON.stringify({ 
                isAuthenticated: true, 
                role: profileData.role, 
                id: existingSession.user.id,
                sessionId: existingSession.access_token
              }));
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          // Check localStorage for cached auth state
          const cachedAuth = localStorage.getItem('booqit_auth');
          if (cachedAuth) {
            try {
              const authData = JSON.parse(cachedAuth);
              // Verify the session is still valid by making a test request
              const { data: user } = await supabase.auth.getUser();
              if (user.user && authData.id === user.user.id) {
                setIsAuthenticated(authData.isAuthenticated);
                setUserRole(authData.role);
                setUserId(authData.id);
              } else {
                // Session is invalid, clear localStorage
                localStorage.removeItem('booqit_auth');
              }
            } catch (error) {
              console.error('Error parsing cached auth:', error);
              localStorage.removeItem('booqit_auth');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Set up authentication state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);

        if (session && session.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          
          // Defer role fetching to avoid callback deadlock
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              if (data) {
                setUserRole(data.role as UserRole);
                // Store in localStorage for persistence
                localStorage.setItem('booqit_auth', JSON.stringify({ 
                  isAuthenticated: true, 
                  role: data.role, 
                  id: session.user.id,
                  sessionId: session.access_token,
                  timestamp: Date.now()
                }));
              }
            } catch (error) {
              console.error('Error fetching user role', error);
            }
          }, 0);
        } else {
          // User is signed out
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          localStorage.removeItem('booqit_auth');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    if (isAuthenticated && role && id) {
      localStorage.setItem('booqit_auth', JSON.stringify({ 
        isAuthenticated, 
        role, 
        id,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('booqit_auth');
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      await supabase.auth.signOut();
      setAuth(false, null, null);
      // Clear any cached data
      localStorage.clear();
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout even if Supabase call fails
      setAuth(false, null, null);
      localStorage.clear();
    }
  };

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/20 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading BooqIt</h1>
          <p className="text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, setAuth, logout }}>
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
