
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { UnifiedAuthManager, AuthState } from '@/utils/unifiedAuthManager';

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
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    user: null,
    session: null,
    loading: true
  });
  
  const queryClient = useQueryClient();
  const authManager = UnifiedAuthManager.getInstance();

  useEffect(() => {
    console.log('🔄 Setting up auth context subscription');
    
    const unsubscribe = authManager.subscribe((state: AuthState) => {
      console.log('📱 Auth state updated:', state);
      setAuthState(state);
    });

    return unsubscribe;
  }, [authManager]);

  const logout = async () => {
    try {
      await authManager.logout();
      queryClient.clear();
      toast.success('Logged out successfully');
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error('Logout completed with errors');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    }
  };

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    authManager.setAuth(isAuthenticated, role, id);
  };

  const contextValue: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    userRole: authState.userRole,
    userId: authState.userId,
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
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
