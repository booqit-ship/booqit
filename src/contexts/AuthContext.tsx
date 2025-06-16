
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const initialized = useRef(false);
  const queryClient = useQueryClient();

  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    try {
      console.log('🔍 Fetching user role for userId:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching user role:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('📝 Creating new profile for user');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (authUser) {
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
                email: authUser.email || '',
                phone: authUser.user_metadata?.phone || '',
                role: 'customer',
                notification_enabled: true
              })
              .select('role')
              .single();
            
            if (insertError) {
              console.error('❌ Error creating profile:', insertError);
              return 'customer';
            }
            
            return newProfile?.role as UserRole || 'customer';
          }
        }
        
        return 'customer'; // Default fallback
      }
      
      console.log('✅ User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('❌ Exception in fetchUserRole:', error);
      return 'customer'; // Default fallback
    }
  };

  const clearAuthState = () => {
    console.log('🧹 Clearing auth state');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    setUser(null);
  };

  const updateAuthStateFromSupabase = async (session: Session | null) => {
    console.log('🔄 Updating auth state from Supabase session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Fetch user role
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        console.log('✅ Auth state updated from Supabase with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from Supabase:', error);
        setUserRole('customer');
      }
    } else {
      clearAuthState();
    }
  };

  const initializeAuth = async () => {
    try {
      console.log('🚀 Initializing auth system...');

      // Set up auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔐 Auth state changed:', event, session?.user?.id);
          await updateAuthStateFromSupabase(session);
          setLoading(false);
        }
      );

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📦 Initial session check:', !!session);
      
      await updateAuthStateFromSupabase(session);
      setLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeAuth();
    }
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('🔧 Manual setAuth called:', { isAuthenticated, role, id });
    
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
    setUserId(id);
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out user...');
      
      // Clear auth state immediately
      clearAuthState();
      
      // Clear all caches
      queryClient.clear();
      
      // Let Supabase handle the logout
      await supabase.auth.signOut();
      
      console.log('✅ Logout successful');
      toast.success('Logged out successfully');
      
      // Redirect to auth page
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Exception during logout:', error);
      toast.error('Logout completed with errors');
      
      // Force redirect even on error
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
