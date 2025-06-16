
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PermanentSession } from '@/utils/permanentSession';
import { SessionManager } from '@/utils/sessionManager';

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
  const timeoutRef = useRef<NodeJS.Timeout>();
  const authValidationRef = useRef(false);
  const sessionCheckRef = useRef<NodeJS.Timeout>();

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
        return 'customer'; // Default fallback
      }
      
      console.log('✅ User role fetched successfully:', data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('❌ Exception in fetchUserRole:', error);
      return 'customer'; // Default fallback
    }
  };

  const ensureProfile = async (user: User) => {
    try {
      console.log('🔧 Ensuring profile exists for user:', user.id);
      
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        return 'customer';
      }
      
      if (existingProfile) {
        console.log('✅ Profile already exists');
        return existingProfile.role as UserRole;
      }
      
      // Create profile if it doesn't exist
      console.log('📝 Creating new profile...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: user.user_metadata?.phone || null,
          role: user.user_metadata?.role || 'customer'
        })
        .select('role')
        .single();
      
      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return 'customer';
      }
      
      console.log('✅ Profile created successfully');
      return newProfile?.role as UserRole || 'customer';
    } catch (error) {
      console.error('❌ Exception in ensureProfile:', error);
      return 'customer';
    }
  };

  const clearAuthState = () => {
    console.log('🧹 Clearing auth state');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    setUser(null);
    PermanentSession.clearSession();
    SessionManager.clearSessionBackup();
  };

  const updateAuthStateFromSession = async (session: Session | null) => {
    console.log('🔄 Updating auth state from session:', !!session);
    
    if (session?.user) {
      try {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        // Save session backup
        SessionManager.saveSessionBackup(session);
        
        // Ensure profile exists and get role
        const role = await ensureProfile(session.user);
        setUserRole(role);
        
        // Save permanently
        PermanentSession.saveSession(session, role || 'customer', session.user.id);
        
        console.log('✅ Auth state updated from session with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from session:', error);
        setUserRole('customer');
        PermanentSession.saveSession(session, 'customer', session.user.id);
      }
    } else {
      console.log('🔄 No session, checking permanent session');
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        // Use permanent session even if Supabase session is gone
        setIsAuthenticated(true);
        setUserId(permanentData.userId);
        setUserRole(permanentData.userRole as UserRole);
        setSession(permanentData.session);
        setUser(permanentData.session?.user || null);
        console.log('✅ Using permanent session instead of Supabase');
      } else {
        clearAuthState();
      }
    }
  };

  // Periodic session validation
  const validateSession = async () => {
    try {
      const currentSession = session;
      if (!currentSession) return;
      
      // Check if session needs refresh
      if (SessionManager.needsRefresh(currentSession)) {
        console.log('🔄 Session needs refresh, attempting...');
        const { session: refreshedSession, error } = await SessionManager.refreshSession();
        
        if (refreshedSession) {
          await updateAuthStateFromSession(refreshedSession);
        } else if (error) {
          console.error('❌ Session refresh failed:', error);
          clearAuthState();
          setTimeout(() => {
            window.location.href = '/auth';
          }, 100);
        }
      } else {
        // Update activity
        SessionManager.updateActivity();
      }
    } catch (error) {
      console.error('❌ Error during session validation:', error);
    }
  };

  // Enhanced session restoration with proper validation
  const restoreSessionInstantly = async (): Promise<boolean> => {
    try {
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        console.log('⚡ INSTANT session restoration from permanent cache');
        
        // Set auth state immediately for instant UI update
        setIsAuthenticated(true);
        setUserId(permanentData.userId);
        setUserRole(permanentData.userRole as UserRole);
        setSession(permanentData.session);
        setUser(permanentData.session?.user || null);
        
        // Validate session in background
        setTimeout(validateSession, 1000);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error during instant session restoration:', error);
    }
    return false;
  };

  // Enhanced auth initialization
  const initializeAuth = async () => {
    if (authValidationRef.current) {
      console.log('🔄 Auth validation already in progress, skipping');
      return;
    }

    try {
      console.log('🚀 Initializing auth system...');
      authValidationRef.current = true;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Auth initialization timeout - setting loading false');
        setLoading(false);
        authValidationRef.current = false;
      }, 8000);

      // STEP 1: Try instant restoration from permanent cache
      const instantlyRestored = await restoreSessionInstantly();
      
      // STEP 2: Set up auth listener for new logins (only once)
      if (!initialized.current) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.id);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('👤 User signed in, updating session');
              await updateAuthStateFromSession(session);
              
              // Send welcome notification after successful login
              try {
                const { sendWelcomeNotification } = await import('@/services/eventNotificationService');
                
                // Get user profile to extract name and role
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('name, role')
                  .eq('id', session.user.id)
                  .single();
                
                if (profile) {
                  const firstName = profile.name?.split(' ')[0] || 'there';
                  await sendWelcomeNotification(
                    session.user.id,
                    profile.role as 'customer' | 'merchant',
                    firstName
                  );
                }
              } catch (error) {
                console.error('❌ Error sending welcome notification:', error);
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 User signed out');
              clearAuthState();
              queryClient.clear();
            } else if (event === 'TOKEN_REFRESHED' && session) {
              console.log('🔄 Token refreshed, updating session');
              SessionManager.saveSessionBackup(session);
              const currentRole = userRole || 'customer';
              PermanentSession.saveSession(session, currentRole, session.user.id);
              setSession(session);
              setUser(session.user);
            }
          }
        );

        // Set up periodic session validation (every 5 minutes)
        sessionCheckRef.current = setInterval(validateSession, 5 * 60 * 1000);

        // Store subscription for cleanup
        initialized.current = true;
        
        return () => {
          subscription.unsubscribe();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (sessionCheckRef.current) {
            clearInterval(sessionCheckRef.current);
          }
        };
      }

      // STEP 3: Only check Supabase if no cached session was found
      if (!instantlyRestored) {
        try {
          console.log('📦 Attempting to get fresh session from Supabase');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            console.log('📦 Got fresh session from Supabase');
            await updateAuthStateFromSession(session);
          } else {
            console.log('📦 No fresh session available from Supabase');
          }
        } catch (error) {
          console.error('❌ Failed to get fresh session:', error);
        }
      }

      // STEP 4: Set loading to false
      console.log('⏹️ Auth initialization complete, setting loading false');
      setLoading(false);
      authValidationRef.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }

    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      setLoading(false);
      authValidationRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initializeAuth();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
    };
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
      
      // Clear timeout if running
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      
      // Clear permanent session first
      PermanentSession.clearSession();
      SessionManager.clearSessionBackup();
      
      // Clear all Supabase-related localStorage keys
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear auth state immediately
      clearAuthState();
      
      // Clear all caches
      queryClient.clear();
      
      // Let Supabase handle the logout (but don't wait for it)
      await supabase.auth.signOut().catch(error => {
        console.error('❌ Supabase logout error (ignoring):', error);
      });
      
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
