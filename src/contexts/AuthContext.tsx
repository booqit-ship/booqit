
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PermanentSession } from '@/utils/permanentSession';

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

  const clearAuthState = () => {
    console.log('🧹 Clearing auth state');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setSession(null);
    setUser(null);
    PermanentSession.clearSession();
  };

  const detectCacheClearing = (): boolean => {
    try {
      // Check for Supabase auth keys in localStorage
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
      );
      
      const permanentSession = PermanentSession.getSession();
      const permanentLoggedIn = localStorage.getItem('booqit-logged-in');
      
      // Enhanced cache clearing detection
      if ((permanentSession.isLoggedIn && supabaseKeys.length === 0) || 
          (!permanentLoggedIn && supabaseKeys.length > 0)) {
        console.log('🚨 Cache clearing detected');
        clearAuthState();
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error detecting cache clearing:', error);
      return false;
    }
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
        
        // Save permanently with updated method signature
        PermanentSession.saveSession(session, role || 'customer', session.user.id);
        
        console.log('✅ Auth state updated from Supabase with role:', role);
      } catch (error) {
        console.error('❌ Error updating auth state from Supabase:', error);
        setUserRole('customer');
        PermanentSession.saveSession(session, 'customer', session.user.id);
      }
    } else {
      console.log('🔄 No Supabase session, checking permanent session');
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn) {
        // Use permanent session even if Supabase session is gone
        setIsAuthenticated(true);
        setUserId(permanentData.userId);
        setUserRole(permanentData.userRole as UserRole);
        setSession(permanentData.session || null);
        setUser(permanentData.session?.user || null);
        console.log('✅ Using permanent session instead of Supabase');
      } else {
        clearAuthState();
      }
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
        setSession(permanentData.session || null);
        setUser(permanentData.session?.user || null);
        
        // Validate tokens with Supabase in background (non-blocking)
        if (permanentData.session?.access_token && permanentData.session?.refresh_token) {
          setTimeout(async () => {
            try {
              console.log('🔍 Background token validation');
              const { error } = await supabase.auth.setSession({
                access_token: permanentData.session!.access_token,
                refresh_token: permanentData.session!.refresh_token
              });
              
              if (error) {
                console.log('⚠️ Background token validation failed:', error);
                // Don't clear state immediately, let session persistence handle it
              } else {
                console.log('✅ Background tokens validated successfully');
              }
            } catch (error) {
              console.log('⚠️ Background token validation error:', error);
            }
          }, 100); // Small delay to not block UI
        }
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error during instant session restoration:', error);
    }
    return false;
  };

  // Enhanced auth initialization with better timing
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

      // Set timeout to prevent infinite loading - but longer for tab switches
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Auth initialization timeout - setting loading false');
        setLoading(false);
        authValidationRef.current = false;
        
        // Check if cache was cleared during timeout
        if (detectCacheClearing()) {
          console.log('🔄 Redirecting to auth due to cache clearing');
        }
      }, 8000); // Increased timeout for better tab switch handling

      // STEP 1: Try instant restoration from permanent cache
      const instantlyRestored = await restoreSessionInstantly();
      
      // STEP 2: Set up auth listener for new logins (only once)
      if (!initialized.current) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔐 Auth state changed:', event, session?.user?.id);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('👤 User signed in, updating permanent session');
              await updateAuthStateFromSupabase(session);
              
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
              console.log('🔄 Token refreshed, updating permanent session');
              const currentRole = userRole || 'customer';
              PermanentSession.saveSession(session, currentRole, session.user.id);
              setSession(session);
              setUser(session.user);
            }
          }
        );

        // Store subscription for cleanup
        return () => {
          subscription.unsubscribe();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }

      // STEP 3: Only check Supabase if no cached session was found
      let supabaseSessionChecked = false;
      if (!instantlyRestored) {
        try {
          console.log('📦 Attempting to get fresh session from Supabase');
          const { data: { session }, error } = await supabase.auth.getSession();
          supabaseSessionChecked = true;
          
          if (session && !error) {
            console.log('📦 Got fresh session from Supabase');
            await updateAuthStateFromSupabase(session);
          } else {
            console.log('📦 No fresh session available from Supabase');
          }
        } catch (error) {
          console.error('❌ Failed to get fresh session:', error);
          supabaseSessionChecked = true;
        }
      }

      // STEP 4: Set loading to false - CRITICAL: Wait for both instant restore AND Supabase check
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
      initialized.current = true;
      initializeAuth();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
      
      // Clear permanent session first
      PermanentSession.clearSession();
      
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
