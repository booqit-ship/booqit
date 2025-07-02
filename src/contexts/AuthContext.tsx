import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  userRole: string | null;
  loading: boolean;
  setAuth: (sessionOrAuth: Session | null | boolean, role?: string, userId?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuth = (sessionOrAuth: Session | null | boolean, role?: string, userId?: string) => {
    if (typeof sessionOrAuth === 'boolean') {
      // Legacy call with boolean, role, userId
      if (sessionOrAuth && role && userId) {
        // Create a mock user object for compatibility
        const mockUser = { id: userId } as User;
        setUser(mockUser);
        setUserRole(role);
      } else {
        setUser(null);
        setUserRole(null);
      }
    } else {
      // New call with session object
      setUser(sessionOrAuth?.user ?? null);
      fetchUserRole(sessionOrAuth?.user?.id);
    }
  };

  const fetchUserRole = async (userId?: string) => {
    if (!userId) {
      setUserRole(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else {
        setUserRole(data?.role || null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuth(session);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuth(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    isAuthenticated: !!user,
    userRole,
    loading,
    setAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};