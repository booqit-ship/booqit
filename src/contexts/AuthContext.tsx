
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { PermanentSession } from '@/utils/permanentSession';
import { sendWelcomeNotification } from '@/services/eventNotificationService';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  session: Session | null;
  loading: boolean;
  setAuth: (isAuthenticated: boolean, userRole: UserRole | null, userId: string | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  session: null,
  loading: true,
  setAuth: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial check for permanent session
  useEffect(() => {
    const permanentData = PermanentSession.getSession();
    if (permanentData.isLoggedIn && permanentData.userRole && permanentData.userId) {
      console.log('⚡ Restoring session from permanent storage:', permanentData);
      setIsAuthenticated(true);
      setUserRole(permanentData.userRole as UserRole);
      setUserId(permanentData.userId);
    }
    setLoading(false); // Set loading to false after initial check
  }, []);

  const setAuth = (isAuthenticated: boolean, userRole: UserRole | null, userId: string | null) => {
    setIsAuthenticated(isAuthenticated);
    setUserRole(userRole);
    setUserId(userId);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setSession(null);
      PermanentSession.clearSession();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 User signed in:', session.user.id);
        
        // Get user profile to determine role and name
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('📋 User profile loaded:', profile);
          
          setUserId(session.user.id);
          setUserRole(profile.role as UserRole);
          setIsAuthenticated(true);
          
          // Save to permanent session
          PermanentSession.saveSession({
            userId: session.user.id,
            userRole: profile.role as UserRole,
            isLoggedIn: true
          });
          
          // Send welcome notification
          console.log('🔔 Triggering welcome notification for:', profile.name, profile.role);
          await sendWelcomeNotification(session.user.id, profile.role as UserRole, profile.name || 'User');
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setUserId(null);
        setUserRole(null);
        setIsAuthenticated(false);
        setSession(null);
        PermanentSession.clearSession();
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    userRole,
    userId,
    session,
    loading,
    setAuth,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
