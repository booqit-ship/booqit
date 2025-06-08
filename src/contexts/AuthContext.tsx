
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sendWelcomeNotification } from '@/services/eventNotificationService';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  userRole: 'customer' | 'merchant' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'merchant' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTriggeredWelcome, setHasTriggeredWelcome] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUserId(session.user.id);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        setUser(session.user);
        setUserId(session.user.id);
        await fetchUserProfile(session.user.id);
        
        // Send welcome notification on sign in (not on initial load)
        if (event === 'SIGNED_IN' && !hasTriggeredWelcome) {
          setHasTriggeredWelcome(true);
          // Small delay to ensure profile is loaded
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, role')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              await sendWelcomeNotification(session.user.id, profile.name, profile.role);
            }
          }, 2000);
        }
      } else {
        setUser(null);
        setUserId(null);
        setUserRole(null);
        setHasTriggeredWelcome(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [hasTriggeredWelcome]);

  const fetchUserProfile = async (id: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      setUserRole(profile.role);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserId(null);
      setUserRole(null);
      setHasTriggeredWelcome(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isAuthenticated = !!user && !!userId && !!userRole;

  return (
    <AuthContext.Provider value={{
      user,
      userId,
      userRole,
      isAuthenticated,
      isLoading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
