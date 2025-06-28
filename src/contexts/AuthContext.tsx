
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

  useEffect(() => {
    const loadSession = async () => {
      try {
        // Check permanent session first
        const permanentSession = PermanentSession.getSession();
        if (permanentSession.isLoggedIn && permanentSession.userId) {
          console.log('🔍 AUTH: Found permanent session, attempting to recover');
          setUserId(permanentSession.userId);
          setUserRole(permanentSession.userRole);
          setIsAuthenticated(true);
        }

        // Get current Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session) {
          console.log('✅ AUTH: Session loaded successfully');
          setUser(session.user);
          setUserId(session.user.id);
          setIsAuthenticated(true);

          // Ensure user role is up-to-date
          if (session.user.id && (!permanentSession.isLoggedIn || permanentSession.userRole === '')) {
            console.log('🔄 AUTH: Fetching user role from database');
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('❌ AUTH: Error fetching profile:', profileError);
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
          }
        } else if (error) {
          console.error('❌ AUTH: Error loading session:', error);
        }
      } catch (sessionError) {
        console.error('❌ AUTH: Unexpected error loading session:', sessionError);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Set up auth state listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('👂 AUTH: Auth state change event:', event);

        if (event === 'INITIAL_SESSION') {
          console.log('✅ AUTH: Initial session loaded');
          if (session && session.user) {
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          }
        } else if (event === 'SIGNED_IN') {
          console.log('✅ AUTH: User signed in');
          if (session && session.user) {
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 AUTH: User signed out');
          setUser(null);
          setUserId('');
          setUserRole('');
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 AUTH: Token refreshed');
          if (session && session.user) {
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          }
        } else if (event === 'USER_UPDATED') {
          console.log('👤 AUTH: User updated');
          if (session && session.user) {
            setUser(session.user);
            setUserId(session.user.id);
            setIsAuthenticated(true);
          }
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
      } else if (data.user) {
        console.log('✅ AUTH: Login successful for:', data.user.id);
        setUser(data.user);
        setUserId(data.user.id);
        setIsAuthenticated(true);

        // Fetch user role and save to permanent session
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ AUTH: Error fetching profile:', profileError);
          toast.error('Error fetching user profile');
        } else if (profileData) {
          const role = profileData.role || 'customer';
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
        }
      }
    } catch (loginError) {
      console.error('❌ AUTH: Unexpected login error:', loginError);
      toast.error('Unexpected error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AUTH: Starting logout process');
      
      // Clear permanent session
      console.log('🧹 AUTH: Clearing permanent session');
      PermanentSession.clearSession();
      
      // Sign out from Supabase
      console.log('🚪 AUTH: Signing out from Supabase');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AUTH: Error during logout:', error);
        toast.error('Error during logout');
      } else {
        console.log('✅ AUTH: Logout successful');
        toast.success('Logged out successfully');
      }

      // Clear local state
      setUser(null);
      setUserId('');
      setUserRole('');
      setIsAuthenticated(false);
      setIsLoading(false);

      // Clear any cached data
      try {
        sessionStorage.clear();
        localStorage.removeItem('booking-draft');
        localStorage.removeItem('performance-metrics');
      } catch (storageError) {
        console.error('❌ AUTH: Error clearing storage:', storageError);
      }

      // Redirect to login
      navigate('/auth');
      
    } catch (error) {
      console.error('❌ AUTH: Unexpected error during logout:', error);
      toast.error('Unexpected error during logout');
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
