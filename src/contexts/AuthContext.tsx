
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PermanentSession } from '@/utils/permanentSession';

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

  // Enhanced logout that clears everything and goes to role selection
  const logout = async () => {
    try {
      console.log('🔓 Starting logout process...');
      
      // Clear permanent session first
      PermanentSession.clearSession();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setUserRole(null);
      
      console.log('✅ Logout completed - redirecting to role selection');
      
      // Force redirect to role selection page
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if logout fails, clear local state and redirect
      PermanentSession.clearSession();
      setUser(null);
      setUserRole(null);
      window.location.href = '/';
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
        console.log('🔄 Auth state change:', event);
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
