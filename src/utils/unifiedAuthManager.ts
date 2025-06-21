
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
    this.setupTabFocusHandling();
  }

  static getInstance(): UnifiedAuthManager {
    if (!UnifiedAuthManager.instance) {
      UnifiedAuthManager.instance = new UnifiedAuthManager();
    }
    return UnifiedAuthManager.instance;
  }

  private setupTabFocusHandling() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentState.isAuthenticated) {
        console.log('🔄 Tab became visible, refreshing auth state');
        this.refreshAuthState();
      }
    });

    window.addEventListener('focus', () => {
      if (this.currentState.isAuthenticated) {
        console.log('🎯 Window focused, checking session validity');
        this.refreshAuthState();
      }
    });
  }

  private async refreshAuthState() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await this.updateAuthState(session);
    } catch (error) {
      console.warn('⚠️ Failed to refresh auth state:', error);
    }
  }

  private async initialize() {
    console.log('🚀 Initializing unified auth manager');
    
    try {
      // Set up auth state listener first
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event, !!session);
        await this.updateAuthState(session);
      });

      // Check for existing session with a shorter timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: any }>((resolve) => {
        setTimeout(() => {
          console.log('⏰ Session check timeout (1 second)');
          resolve({ data: { session: null }, error: { message: 'Timeout' } });
        }, 1000); // Reduced to 1 second for faster initialization
      });

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      console.log('📱 Initial session check result:', !!session);
      await this.updateAuthState(session);
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      this.updateState({ ...this.currentState, loading: false });
    }
  }

  private async updateAuthState(session: Session | null) {
    console.log('🔄 Updating auth state, session exists:', !!session);
    
    try {
      if (session?.user) {
        console.log('✅ Valid session found, fetching user role');
        const userRole = await this.fetchUserRole(session.user.id);
        
        const newState = {
          isAuthenticated: true,
          user: session.user,
          session: session,
          userRole: userRole,
          userId: session.user.id,
          loading: false
        };
        
        console.log('🎯 Setting authenticated state:', { userRole, userId: session.user.id });
        this.updateState(newState);
        
        // Store session in localStorage for quick recovery
        localStorage.setItem('booqit-session', JSON.stringify({
          user: session.user,
          userRole,
          userId: session.user.id,
          timestamp: Date.now()
        }));
        
      } else {
        console.log('❌ No valid session, clearing auth state');
        this.clearAuthState();
      }
    } catch (error) {
      console.error('❌ Error updating auth state:', error);
      this.clearAuthState();
    }
  }

  private async fetchUserRole(userId: string): Promise<'customer' | 'merchant'> {
    try {
      console.log('🔍 Fetching user role for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn('Failed to fetch user role:', error);
        return 'customer';
      }
      
      const role = data?.role as 'customer' | 'merchant' || 'customer';
      console.log('👤 User role fetched:', role);
      return role;
    } catch (error) {
      console.warn('Exception fetching user role:', error);
      return 'customer';
    }
  }

  private clearAuthState() {
    console.log('🧹 Clearing auth state');
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
    console.log('📊 State update:', { 
      wasAuthenticated: this.currentState.isAuthenticated,
      nowAuthenticated: newState.isAuthenticated,
      loading: newState.loading,
      userRole: newState.userRole
    });
    
    this.currentState = newState;
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.error('❌ Error in auth listener:', error);
      }
    });
  }

  getState(): AuthState {
    return { ...this.currentState };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    try {
      listener(this.currentState);
    } catch (error) {
      console.error('❌ Error in initial auth listener call:', error);
    }
    
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
    console.log('🔧 Manual auth state update:', { isAuthenticated, role, id });
    this.updateState({
      ...this.currentState,
      isAuthenticated,
      userRole: role,
      userId: id
    });
  }
}
