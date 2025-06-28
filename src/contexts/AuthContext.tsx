
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

  console.log('🔧 AuthProvider state:', { isAuthenticated, userId, userRole, isLoading });

  const setAuth = (authenticated: boolean, role: UserRole, userId: string) => {
    console.log('🔧 Setting auth state:', { authenticated, role, userId });
    setIsAuthenticated(authenticated);
    setUserRole(role);
    setUserId(userId);
    
    if (authenticated && userId && role) {
      PermanentSession.saveSession(null, role, userId);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 AUTH: Initializing authentication...');
        
        // Check permanent session for immediate UI update
        const permanentSession = PermanentSession.getSession();
        if (permanentSession.isLoggedIn && permanentSession.userId && mounted) {
          console.log('📖 AUTH: Loading from permanent session');
          setUserId(permanentSession.userId);
          setUserRole(permanentSession.userRole);
          setIsAuthenticated(true);
        }

        // Get Supabase session
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) {
          console.error('⚠️ AUTH: Session fetch error:', error);
        }

        const session = sessionData?.session;

        if (!mounted) return;

        if (session && session.user) {
          console.log('✅ AUTH: Valid Supabase session found');
          setUser(session.user);
          setUserId(session.user.id);
          setIsAuthenticated(true);

          // Get or create user profile
          try {
            const { data: profileData } = await supabase
              .rpc('get_or_create_user_profile', { p_user_id: session.user.id });

            if (profileData && profileData[0] && mounted) {
              const role = profileData[0].role || 'customer';
              setUserRole(role);
              PermanentSession.saveSession(session, role, session.user.id);
              console.log('✅ AUTH: User role updated to:', role);
            }
          } catch (roleError) {
            console.warn('⚠️ AUTH: Could not fetch/create profile, using default:', roleError);
            const defaultRole = 'customer';
            setUserRole(defaultRole);
            PermanentSession.saveSession(session, defaultRole, session.user.id);
          }
        } else {
          console.log('ℹ️ AUTH: No valid session');
          if (!permanentSession.isLoggedIn && mounted) {
            console.log('🧹 AUTH: Clearing auth state');
            setIsAuthenticated(false);
            setUserId('');
            setUserRole('');
            setUser(null);
            PermanentSession.clearSession();
          }
        }
      } catch (error) {
        console.error('❌ AUTH: Error initializing auth:', error);
        const permanentSession = PermanentSession.getSession();
        if (!permanentSession.isLoggedIn && mounted) {
          setIsAuthenticated(false);
          setUserId('');
          setUserRole('');
          setUser(null);
          PermanentSession.clearSession();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('👂 AUTH: Auth state change:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ AUTH: User signed in');
          setUser(session.user);
          setUserId(session.user.id);
          setIsAuthenticated(true);
          
          // Get profile asynchronously
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const { data: profileData } = await supabase
                .rpc('get_or_create_user_profile', { p_user_id: session.user.id });
              
              if (profileData && profileData[0] && mounted) {
                const role = profileData[0].role || 'customer';
                setUserRole(role);
                PermanentSession.saveSession(session, role, session.user.id);
              }
            } catch (error) {
              console.warn('⚠️ AUTH: Profile fetch after sign in failed:', error);
              if (mounted) {
                setUserRole('customer');
                PermanentSession.saveSession(session, 'customer', session.user.id);
              }
            }
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 AUTH: User signed out');
          PermanentSession.clearSession();
          setUser(null);
          setUserId('');
          setUserRole('');
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 AUTH: Token refreshed');
          setUser(session.user);
          PermanentSession.refreshLogin();
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔑 AUTH: Attempting login');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AUTH: Login error:', error);
        toast.error('Invalid credentials');
      } else if (data.user) {
        console.log('✅ AUTH: Login successful');
        toast.success('Logged in successfully');
        navigate('/');
      }
    } catch (error) {
      console.error('❌ AUTH: Unexpected login error:', error);
      toast.error('Unexpected error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AUTH: Starting logout');
      
      // Clear permanent session first
      PermanentSession.clearSession();
      
      // Clear local state first to prevent UI flicker
      setUser(null);
      setUserId('');
      setUserRole('');
      setIsAuthenticated(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ AUTH: Logout error:', error);
        toast.error('Error during logout');
      } else {
        console.log('✅ AUTH: Logout successful');
        toast.success('Logged out successfully');
      }

      // Clear cached data
      try {
        sessionStorage.clear();
        localStorage.removeItem('booking-draft');
        localStorage.removeItem('performance-metrics');
      } catch (error) {
        console.error('❌ AUTH: Error clearing storage:', error);
      }

      navigate('/auth');
    } catch (error) {
      console.error('❌ AUTH: Unexpected logout error:', error);
      toast.error('Unexpected error during logout');
    }
  };

  const updateUserRole = (newRole: string) => {
    console.log(`👤 AUTH: Updating user role to: ${newRole}`);
    setUserRole(newRole);
    PermanentSession.updateUserRole(newRole);
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
