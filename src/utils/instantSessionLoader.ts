
import { PermanentSession } from './permanentSession';
import { UserRole } from '@/types';

// INSTANT session loader - runs BEFORE React renders anything
export class InstantSessionLoader {
  private static initialAuthState: {
    isAuthenticated: boolean;
    userRole: UserRole | null;
    userId: string | null;
    user: any | null;
    session: any | null;
  } | null = null;

  // Load session data INSTANTLY on app start
  static preloadSession() {
    console.log('⚡ INSTANT: Pre-loading session before React renders');
    
    try {
      const permanentData = PermanentSession.getSession();
      
      if (permanentData.isLoggedIn && permanentData.userId && permanentData.userRole) {
        this.initialAuthState = {
          isAuthenticated: true,
          userRole: permanentData.userRole as UserRole,
          userId: permanentData.userId,
          user: permanentData.session?.user || null,
          session: permanentData.session
        };
        
        console.log('⚡ INSTANT: Session pre-loaded successfully for instant access');
        return true;
      }
      
      console.log('⚡ INSTANT: No session to pre-load');
      this.initialAuthState = {
        isAuthenticated: false,
        userRole: null,
        userId: null,
        user: null,
        session: null
      };
      return false;
    } catch (error) {
      console.error('❌ INSTANT: Error pre-loading session:', error);
      return false;
    }
  }

  // Get the instantly loaded session data
  static getPreloadedSession() {
    return this.initialAuthState;
  }

  // Check if we have a valid session instantly
  static hasInstantSession() {
    return this.initialAuthState?.isAuthenticated === true;
  }
}

// Run this immediately when the module loads
InstantSessionLoader.preloadSession();
