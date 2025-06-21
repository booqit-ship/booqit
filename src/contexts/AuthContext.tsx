
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { SimplifiedAuthManager } from '@/utils/simplifiedAuthManager';

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
  
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔥 SIMPLIFIED AUTH CONTEXT: Initializing...');
    
    // Initialize simplified auth manager
    SimplifiedAuthManager.initializeAuth().finally(() => {
      setLoading(false);
    });

    // Subscribe to auth state changes
    const unsubscribe = SimplifiedAuthManager.subscribe((authState) => {
      console.log('🔄 AUTH CONTEXT: State updated from manager', {
        isAuthenticated: authState.isAuthenticated,
        userRole: authState.userRole,
        userId: !!authState.userId
      });

      setIsAuthenticated(authState.isAuthenticated);
      setUserRole(authState.userRole);
      setUserId(authState.userId);
      setUser(authState.user);
      setSession(authState.session);
    });

    // Return cleanup function that calls unsubscribe
    return () => {
      unsubscribe();
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 AUTH CONTEXT: Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 AUTH CONTEXT: Logout initiated...');
      
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setSession(null);
      setUser(null);
      
      queryClient.clear();
      
      await SimplifiedAuthManager.logout();
      
      toast.success('Logged out successfully');
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Logout error:', error);
      toast.error('Logout completed with errors');
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
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
