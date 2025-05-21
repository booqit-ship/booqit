
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

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

  useEffect(() => {
    // Check local storage for existing auth
    const storedAuth = localStorage.getItem('booqit_auth');
    if (storedAuth) {
      try {
        const { isAuthenticated, role, id } = JSON.parse(storedAuth);
        setIsAuthenticated(isAuthenticated);
        setUserRole(role);
        setUserId(id);
      } catch (error) {
        console.error('Failed to parse auth data', error);
        localStorage.removeItem('booqit_auth');
      }
    }
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

  const logout = () => {
    setAuth(false, null, null);
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
