
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userRole: 'customer' | 'merchant' | null;
  userId: string | null;
  loading: boolean;
}

export class UnifiedAuthManager {
  private static instance: UnifiedAuthManager;
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = {
    isAuthenticated: false,
    user: null,
    session: null,
    userRole: null,
    userId: null,
    loading: true
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): UnifiedAuthManager {
    if (!UnifiedAuthManager.instance) {
      UnifiedAuthManager.instance = new UnifiedAuthManager();
    }
    return UnifiedAuthManager.instance;
  }

  private async initialize() {
    console.log('🚀 Initializing unified auth manager');
    
    try {
      // Set up auth state listener first
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        await this.updateAuthState(session);
      });

      // Check for existing session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: any }>((resolve) => {
        setTimeout(() => {
          console.log('⏰ Session check timeout');
          resolve({ data: { session: null }, error: { message: 'Timeout' } });
        }, 3000);
      });

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      await this.updateAuthState(session);
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      this.updateState({ ...this.currentState, loading: false });
    }
  }

  private async updateAuthState(session: Session | null) {
    try {
      if (session?.user) {
        const userRole = await this.fetchUserRole(session.user.id);
        
        this.updateState({
          isAuthenticated: true,
          user: session.user,
          session: session,
          userRole: userRole,
          userId: session.user.id,
          loading: false
        });
        
        // Store session in localStorage for quick recovery
        localStorage.setItem('booqit-session', JSON.stringify({
          user: session.user,
          userRole,
          userId: session.user.id,
          timestamp: Date.now()
        }));
        
      } else {
        // Try to recover from localStorage
        const stored = localStorage.getItem('booqit-session');
        if (stored) {
          try {
            const { user, userRole, userId, timestamp } = JSON.parse(stored);
            // Only use stored session if it's less than 1 hour old
            if (Date.now() - timestamp < 3600000) {
              this.updateState({
                isAuthenticated: true,
                user,
                session: null,
                userRole,
                userId,
                loading: false
              });
              return;
            }
          } catch (e) {
            console.warn('Failed to parse stored session');
          }
        }
        
        this.clearAuthState();
      }
    } catch (error) {
      console.error('❌ Error updating auth state:', error);
      this.clearAuthState();
    }
  }

  private async fetchUserRole(userId: string): Promise<'customer' | 'merchant'> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('Failed to fetch user role:', error);
        return 'customer';
      }
      
      return data?.role as 'customer' | 'merchant' || 'customer';
    } catch (error) {
      console.warn('Exception fetching user role:', error);
      return 'customer';
    }
  }

  private clearAuthState() {
    localStorage.removeItem('booqit-session');
    this.updateState({
      isAuthenticated: false,
      user: null,
      session: null,
      userRole: null,
      userId: null,
      loading: false
    });
  }

  private updateState(newState: AuthState) {
    this.currentState = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  getState(): AuthState {
    return { ...this.currentState };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.currentState);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async logout() {
    try {
      console.log('👋 Logging out user...');
      this.clearAuthState();
      await supabase.auth.signOut();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local state even if signOut fails
      this.clearAuthState();
    }
  }

  setAuth(isAuthenticated: boolean, role: 'customer' | 'merchant' | null, id: string | null) {
    this.updateState({
      ...this.currentState,
      isAuthenticated,
      userRole: role,
      userId: id
    });
  }
}
