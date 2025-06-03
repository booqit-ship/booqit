
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

  useEffect(() => {
    // Set up authentication state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session && session.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          
          // Fetch user role from profiles table
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              if (data) {
                setUserRole(data.role as UserRole);
                localStorage.setItem('booqit_auth', JSON.stringify({ 
                  isAuthenticated: true, 
                  role: data.role, 
                  id: session.user.id 
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

    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session && session.user) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role from profiles table
        try {
          // Fix: Use proper Promise handling with async/await pattern
          const fetchUserRole = async () => {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
                
              if (data) {
                setUserRole(data.role as UserRole);
                localStorage.setItem('booqit_auth', JSON.stringify({ 
                  isAuthenticated: true, 
                  role: data.role, 
                  id: session.user.id 
                }));
              }
              
              if (error) {
                console.error('Error fetching user role', error);
              }
            } catch (error) {
              console.error('Exception in user role query', error);
            }
          };
          
          fetchUserRole();
        } catch (error) {
          console.error('Error in user role query setup', error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
    
    if (isAuthenticated && role && id) {
      localStorage.setItem('booqit_auth', JSON.stringify({ isAuthenticated, role, id }));
    } else {
      localStorage.removeItem('booqit_auth');
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAuth(false, null, null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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
