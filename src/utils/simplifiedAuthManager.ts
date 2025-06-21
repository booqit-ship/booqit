
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { BackendHealthCheck } from './backendHealthCheck';

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
  session: any | null;
  user: any | null;
}

export class SimplifiedAuthManager {
  private static currentState: AuthState = {
    isAuthenticated: false,
    userRole: null,
    userId: null,
    session: null,
    user: null
  };

  private static listeners: Set<(state: AuthState) => void> = new Set();

  static getCurrentState(): AuthState {
    return { ...this.currentState };
  }

  static subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners() {
    this.listeners.forEach(listener => listener(this.getCurrentState()));
  }

  static async initializeAuth(): Promise<void> {
    console.log('🔐 SIMPLIFIED AUTH: Initializing authentication...');

    try {
      // Check backend health first
      const health = await BackendHealthCheck.checkHealth();
      if (!health.isHealthy) {
        console.warn('⚠️ SIMPLIFIED AUTH: Backend unhealthy, using fallback');
        return;
      }

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ SIMPLIFIED AUTH: Session check failed:', error);
        this.clearAuthState();
        return;
      }

      if (session?.user) {
        await this.updateAuthState(session);
      } else {
        console.log('📭 SIMPLIFIED AUTH: No active session');
        this.clearAuthState();
      }

      // Set up auth listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 SIMPLIFIED AUTH: Auth state changed:', event);
        
        if (session?.user) {
          await this.updateAuthState(session);
        } else {
          this.clearAuthState();
        }
      });

    } catch (error) {
      console.error('❌ SIMPLIFIED AUTH: Initialization failed:', error);
      this.clearAuthState();
    }
  }

  private static async updateAuthState(session: any) {
    try {
      let userRole: UserRole = 'customer';
      
      // Fetch user role if we have a valid session
      if (session.user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        userRole = (data?.role as UserRole) || 'customer';
      }

      this.currentState = {
        isAuthenticated: true,
        userRole,
        userId: session.user.id,
        session,
        user: session.user
      };

      console.log('✅ SIMPLIFIED AUTH: State updated:', {
        userId: !!this.currentState.userId,
        userRole: this.currentState.userRole
      });

    } catch (error) {
      console.error('❌ SIMPLIFIED AUTH: Failed to update state:', error);
      // Set basic state even if role fetch fails
      this.currentState = {
        isAuthenticated: true,
        userRole: 'customer',
        userId: session.user.id,
        session,
        user: session.user
      };
    }

    this.notifyListeners();
  }

  private static clearAuthState() {
    this.currentState = {
      isAuthenticated: false,
      userRole: null,
      userId: null,
      session: null,
      user: null
    };
    
    console.log('🧹 SIMPLIFIED AUTH: State cleared');
    this.notifyListeners();
  }

  static async logout() {
    try {
      await supabase.auth.signOut();
      this.clearAuthState();
      console.log('👋 SIMPLIFIED AUTH: Logout successful');
    } catch (error) {
      console.error('❌ SIMPLIFIED AUTH: Logout failed:', error);
      // Clear state anyway
      this.clearAuthState();
    }
  }
}
