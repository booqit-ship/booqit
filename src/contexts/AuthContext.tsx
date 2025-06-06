import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  loading: boolean;
  setAuth: (isAuthenticated: boolean, role: UserRole | null, id: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[AuthProvider] Component mounted');
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('[Auth] Initializing authentication...');
    
    const restoreSession = async () => {
      setLoading(true);
      try {
        console.log('[Auth] Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Session restoration error:', error);
          throw error;
        }

        if (session && session.user) {
          console.log('[Auth] Session restored successfully:', session.user.id);
          setSession(session);
          setIsAuthenticated(true);
          setUserId(session.user.id);
          
          // Fetch user role from profiles table
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profileData && !profileError) {
              const role = profileData.role as UserRole;
              setUserRole(role);
              console.log('[Auth] User role restored:', role);
              
              // Store in localStorage for quick access
              localStorage.setItem('booqit_auth', JSON.stringify({ 
                isAuthenticated: true, 
                role: role, 
                id: session.user.id 
              }));
              
              toast.success('Welcome back! Session restored successfully.', {
                style: {
                  background: '#E6E6FA',
                  color: '#5B21B6',
                  fontFamily: 'Poppins, sans-serif',
                }
              });
            } else {
              console.error('[Auth] Failed to fetch user role:', profileError);
              toast.error('Failed to restore user profile. Please log in again.', {
                style: {
                  background: '#E6E6FA',
                  color: '#5B21B6',
                  fontFamily: 'Poppins, sans-serif',
                }
              });
            }
          } catch (error) {
            console.error('[Auth] Exception in user role query:', error);
          }
        } else {
          console.log('[Auth] No existing session found');
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          localStorage.removeItem('booqit_auth');
        }
      } catch (err) {
        console.error('[Auth] Session restoration failed:', err);
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        localStorage.removeItem('booqit_auth');
        
        toast.error('Failed to restore your session. Please log in again.', {
          style: {
            background: '#E6E6FA',
            color: '#5B21B6',
            fontFamily: 'Poppins, sans-serif',
          }
        });
      } finally {
        setLoading(false);
        console.log('[Auth] Session restoration completed');
      }
    };

    // Set up authentication state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.id);
        setSession(session);

        if (session && session.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          
          // For sign-in events, fetch user role
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              if (profileData) {
                const role = profileData.role as UserRole;
                setUserRole(role);
                localStorage.setItem('booqit_auth', JSON.stringify({ 
                  isAuthenticated: true, 
                  role: role, 
                  id: session.user.id 
                }));
                console.log('[Auth] User role set:', role);
              }
            } catch (error) {
              console.error('[Auth] Error fetching user role on auth change:', error);
            }
          }
          
          if (event === 'SIGNED_IN') {
            toast.success('Successfully logged in!', {
              style: {
                background: '#E6E6FA',
                color: '#5B21B6',
                fontFamily: 'Poppins, sans-serif',
              }
            });
          }
        } else {
          // User is signed out
          console.log('[Auth] User signed out or session expired');
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          localStorage.removeItem('booqit_auth');
          
          if (event === 'SIGNED_OUT') {
            toast.success('Successfully logged out!', {
              style: {
                background: '#E6E6FA',
                color: '#5B21B6',
                fontFamily: 'Poppins, sans-serif',
              }
            });
          }
        }
      }
    );

    // Restore session on app startup
    restoreSession();

    return () => {
      console.log('[Auth] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const setAuth = (isAuthenticated: boolean, role: UserRole | null, id: string | null) => {
    console.log('[Auth] Manual auth update:', { isAuthenticated, role, id });
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
      console.log('[Auth] Logging out user...');
      await supabase.auth.signOut();
      setAuth(false, null, null);
      console.log('[Auth] Logout completed');
    } catch (error) {
      console.error('[Auth] Error logging out:', error);
      toast.error('Error logging out. Please try again.', {
        style: {
          background: '#E6E6FA',
          color: '#5B21B6',
          fontFamily: 'Poppins, sans-serif',
        }
      });
    }
  };

  console.log('[AuthProvider] Providing context with values:', { 
    isAuthenticated, 
    userRole, 
    userId, 
    loading 
  });

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userRole, 
      userId, 
      loading, 
      setAuth, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  console.log('[useAuth] Hook called');
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[useAuth] ERROR: Hook called outside of AuthProvider!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('[useAuth] Context found:', context);
  return context;
};
