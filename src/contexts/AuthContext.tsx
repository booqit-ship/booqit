
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { handleUserLoginNotification, setupBookingStatusListener } from '@/services/realWorldNotificationService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userId: string | null;
  userRole: 'customer' | 'merchant' | null;
  userEmail: string | null;
  userName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setAuth: (authenticated: boolean, role: 'customer' | 'merchant', userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'merchant' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingListener, setBookingListener] = useState<any>(null);

  const isAuthenticated = !!session;
  const userId = user?.id || null;
  const userEmail = user?.email || null;

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (profile) {
        setUserRole(profile.role as 'customer' | 'merchant');
        setUserName(profile.name);
        
        // Trigger welcome notification for real users (not during testing)
        if (profile.role && profile.name) {
          // Small delay to ensure FCM token is ready
          setTimeout(() => {
            handleUserLoginNotification(userId, profile.role as 'customer' | 'merchant', profile.name);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const setAuth = (authenticated: boolean, role: 'customer' | 'merchant', userId: string) => {
    setUserRole(role);
    // Additional auth state updates can be added here if needed
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast.error('Error signing out');
      } else {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUserName(null);
        
        // Clean up booking listener
        if (bookingListener) {
          bookingListener.unsubscribe();
          setBookingListener(null);
        }
        
        toast.success('Signed out successfully');
      }
    } catch (error) {
      console.error('Error in signOut:', error);
      toast.error('Error signing out');
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, !!currentSession);
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setUserRole(null);
          setUserName(null);
          
          // Clean up booking listener when user logs out
          if (bookingListener) {
            bookingListener.unsubscribe();
            setBookingListener(null);
          }
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (bookingListener) {
        bookingListener.unsubscribe();
      }
    };
  }, []);

  // Set up booking listener when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userRole && !bookingListener) {
      console.log('🔔 Setting up booking notifications for authenticated user');
      const listener = setupBookingStatusListener();
      setBookingListener(listener);
    }
  }, [isAuthenticated, userRole, bookingListener]);

  const signOut = logout; // Alias for backward compatibility

  const refreshAuth = async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing auth:', error);
        return;
      }
      
      setSession(refreshedSession);
      setUser(refreshedSession?.user || null);
      
      if (refreshedSession?.user) {
        await fetchUserProfile(refreshedSession.user.id);
      } else {
        setUserRole(null);
        setUserName(null);
      }
    } catch (error) {
      console.error('Error in refreshAuth:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      session,
      userId,
      userRole,
      userEmail,
      userName,
      loading: isLoading,
      signOut,
      logout,
      refreshAuth,
      setAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
