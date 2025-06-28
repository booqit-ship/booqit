
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PermanentSession } from '@/utils/permanentSession';
import { UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  userId: string;
  userRole: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean; // Added for backward compatibility
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (newRole: string) => void;
  setAuth: (authenticated: boolean, role: UserRole, userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const setAuth = (authenticated: boolean, role: UserRole, userId: string) => {
    setIsAuthenticated(authenticated);
    setUserRole(role);
    setUserId(userId);
  };

  const clearAuthState = () => {
    setUser(null);
    setUserId('');
    setUserRole('');
    setIsAuthenticated(false);
    PermanentSession.clearSession();
  };

  const handleAuthError = async (error: any) => {
    console.error('❌ AUTH: Authentication error:', error);
    
    // Check if it's a token refresh error
    if (error?.message?.includes('refresh_token_not_found') || 
        error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('refresh token not found')) {
      
      console.log('🔄 AUTH: Refresh token expired, clearing session');
      clearAuthState();
      toast.error('Your session has expired. Please sign in again.');
      navigate('/auth');
      return;
    }
    
    // For other auth errors, also clear state
    if (error?.status === 400 || error?.status === 401) {
      console.log('🔄 AUTH: Authentication failed, clearing session');
      clearAuthState();
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log('🔍 AUTH: Loading initial session');
        
        // Check permanent session first for quick UI updates
        const permanentSession = PermanentSession.getSession();
        if (permanentSession.isLoggedIn && permanentSession.userId) {
          console.log('✅ AUTH: Found permanent session');
          setUserId(permanentSession.userId);
          setUserRole(permanentSession.userRole);
          setIsAuthenticated(true);
        }

        // Get current Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          await handleAuthError(error);
          return;
        }

        if (session?.user) {
          console.log('✅ AUTH: Valid session found');
          setUser(session.user);
          setUserId(session.user.id);
          setIsAuthenticated(true);

          // Fetch user role if we don't have it
          if (!permanentSession.isLoggedIn || !permanentSession.userRole) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

              if (profileError) {
                console.error('❌ AUTH: Error fetching profile:', profileError);
                // Don't fail auth for profile errors, use default role
                const role = 'customer';
                setUserRole(role);
                PermanentSession.saveSession({
                  userId: session.user.id,
                  email: session.user.email || '',
                  userRole: role,
                  isLoggedIn: true,
                  session
                });
              } else if (profileData) {
                const role = profileData.role || 'customer';
                setUserRole(role);
                PermanentSession.saveSession({
                  userId: session.user.id,
                  email: session.user.email || '',
                  userRole: role,
                  isLoggedIn: true,
                  session
                });
              }
            } catch (profileError) {
              console.error('❌ AUTH: Profile fetch failed:', profileError);
              // Use default role if profile fetch fails
              setUserRole('customer');
            }
          }
        } else {
          console.log('ℹ️ AUTH: No valid session found');
          clearAuthState();
        }
      } catch (sessionError) {
        console.error('❌ AUTH: Session loading failed:', sessionError);
        await handleAuthError(sessionError);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('👂 AUTH: Auth state change event:', event);

        try {
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
            console.log('🚪 AUTH: User signed out or token refresh failed');
            clearAuthState();
          } else if (session?.user) {
            console.log('✅ AUTH: Session updated');
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          } else if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ AUTH: User signed in');
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          }
        } catch (error) {
          await handleAuthError(error);
        }
      }
    );

    return () => {
      console.log('🚪 AUTH: Removing auth state listener');
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔑 AUTH: Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ AUTH: Login error:', error);
        toast.error('Invalid credentials');
        return;
      } 
      
      if (data.user) {
        console.log('✅ AUTH: Login successful');
        setUser(data.user);
        setUserId(data.user.id);
        setIsAuthenticated(true);

        // Fetch user role
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          const role = profileData?.role || 'customer';
          setUserRole(role);
          
          PermanentSession.saveSession({
            userId: data.user.id,
            email: data.user.email || '',
            userRole: role,
            isLoggedIn: true,
            session: data.session
          });
          
          toast.success('Logged in successfully');
          navigate('/');
        } catch (profileError) {
          console.error('❌ AUTH: Profile fetch error during login:', profileError);
          // Use default role and continue
          setUserRole('customer');
          PermanentSession.saveSession({
            userId: data.user.id,
            email: data.user.email || '',
            userRole: 'customer',
            isLoggedIn: true,
            session: data.session
          });
          toast.success('Logged in successfully');
          navigate('/');
        }
      }
    } catch (loginError) {
      console.error('❌ AUTH: Login failed:', loginError);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AUTH: Starting logout process');
      
      // Clean up tokens if available
      if (userId) {
        try {
          const { EnhancedTokenCleanupService } = await import('@/services/EnhancedTokenCleanupService');
          await EnhancedTokenCleanupService.cleanupUserTokensOnLogout(userId);
        } catch (cleanupError) {
          console.error('❌ AUTH: Token cleanup failed:', cleanupError);
        }
      }

      // Clear permanent session first
      PermanentSession.clearSession();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AUTH: Error during logout:', error);
      } else {
        console.log('✅ AUTH: Logout successful');
      }

      // Clear state regardless of Supabase result
      clearAuthState();
      
      // Clear cached data
      try {
        sessionStorage.clear();
        localStorage.removeItem('booking-draft');
        localStorage.removeItem('performance-metrics');
        localStorage.removeItem('user_location');
        localStorage.removeItem('user_profile');
      } catch (storageError) {
        console.error('❌ AUTH: Error clearing storage:', storageError);
      }

      toast.success('Logged out successfully');
      navigate('/auth');
      
    } catch (error) {
      console.error('❌ AUTH: Logout failed:', error);
      // Force clear state even if logout fails
      clearAuthState();
      navigate('/auth');
    }
  };

  const updateUserRole = async (newRole: string) => {
    try {
      console.log(`👤 AUTH: Updating user role to: ${newRole}`);
      setUserRole(newRole);
      PermanentSession.updateUserRole(newRole);
    } catch (roleError) {
      console.error('❌ AUTH: Error updating user role:', roleError);
      toast.error('Error updating user role');
    }
  };

  const value = {
    user,
    userId,
    userRole,
    isAuthenticated,
    isLoading,
    loading: isLoading,
    login,
    logout,
    updateUserRole,
    setAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
