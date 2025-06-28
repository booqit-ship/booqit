
import { Session } from '@supabase/supabase-js';

interface PermanentSessionData {
  userId: string;
  email: string;
  userRole: string;
  isLoggedIn: boolean;
  session?: Session | null;
  lastLogin?: string;
}

export class PermanentSession {
  private static readonly STORAGE_KEY = 'booqit_permanent_session';
  private static readonly SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Enhanced save method that works with both Firebase and Supabase sessions
  static saveSession(session: Session | null, userRole: string, userId: string): void {
    try {
      const sessionData: PermanentSessionData = {
        userId,
        email: session?.user?.email || '',
        userRole,
        isLoggedIn: true,
        session,
        lastLogin: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Permanent session saved:', { userId, userRole, hasSession: !!session });
    } catch (error) {
      console.error('❌ Error saving permanent session:', error);
    }
  }

  // Enhanced get method with validation
  static getSession(): PermanentSessionData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.getEmptySession();
      }

      const sessionData: PermanentSessionData = JSON.parse(stored);
      
      // Validate session data
      if (!sessionData.userId || !sessionData.userRole) {
        console.warn('⚠️ Invalid permanent session data, clearing');
        this.clearSession();
        return this.getEmptySession();
      }

      // Check session timeout
      if (sessionData.lastLogin) {
        const lastLogin = new Date(sessionData.lastLogin);
        const now = new Date();
        if (now.getTime() - lastLogin.getTime() > this.SESSION_TIMEOUT) {
          console.warn('⚠️ Permanent session expired, clearing');
          this.clearSession();
          return this.getEmptySession();
        }
      }

      console.log('📖 Permanent session loaded:', { 
        userId: sessionData.userId, 
        userRole: sessionData.userRole,
        isLoggedIn: sessionData.isLoggedIn 
      });
      
      return sessionData;
    } catch (error) {
      console.error('❌ Error reading permanent session:', error);
      this.clearSession();
      return this.getEmptySession();
    }
  }

  static clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Permanent session cleared');
    } catch (error) {
      console.error('❌ Error clearing permanent session:', error);
    }
  }

  static isLoggedIn(): boolean {
    const session = this.getSession();
    return session.isLoggedIn && !!session.userId;
  }

  static updateUserRole(newRole: string): void {
    try {
      const currentSession = this.getSession();
      if (currentSession.isLoggedIn) {
        currentSession.userRole = newRole;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentSession));
        console.log('👤 User role updated in permanent session:', newRole);
      }
    } catch (error) {
      console.error('❌ Error updating user role in permanent session:', error);
    }
  }

  private static getEmptySession(): PermanentSessionData {
    return {
      userId: '',
      email: '',
      userRole: '',
      isLoggedIn: false,
      session: null
    };
  }

  // Helper method to refresh the last login timestamp
  static refreshLogin(): void {
    try {
      const currentSession = this.getSession();
      if (currentSession.isLoggedIn) {
        currentSession.lastLogin = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentSession));
      }
    } catch (error) {
      console.error('❌ Error refreshing login timestamp:', error);
    }
  }
}
