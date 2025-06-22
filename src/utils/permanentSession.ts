
import { Session } from '@supabase/supabase-js';

interface PermanentSessionData {
  userId: string;
  email: string;
  userRole: string;
  isLoggedIn: boolean;
  session?: Session | null;
  timestamp?: number;
  version?: string;
}

const STORAGE_KEY = 'booqit_permanent_session';
const SESSION_VERSION = '1.0';
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days

export class PermanentSession {
  private static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private static isSessionExpired(timestamp: number): boolean {
    const now = Date.now();
    const expiryTime = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
    return (now - timestamp) > expiryTime;
  }

  static saveSession(data: Omit<PermanentSessionData, 'timestamp' | 'version'>): void;
  static saveSession(session: Session, userRole: string, userId: string): void;
  static saveSession(
    dataOrSession: Omit<PermanentSessionData, 'timestamp' | 'version'> | Session,
    userRole?: string,
    userId?: string
  ): void {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage not available, session will not persist');
      return;
    }

    try {
      let sessionData: PermanentSessionData;

      // Handle both call signatures
      if (userRole && userId && 'user' in dataOrSession) {
        // Called with (session, userRole, userId)
        const session = dataOrSession as Session;
        sessionData = {
          userId,
          email: session.user?.email || '',
          userRole,
          isLoggedIn: true,
          session,
          timestamp: Date.now(),
          version: SESSION_VERSION
        };
      } else {
        // Called with data object
        const data = dataOrSession as Omit<PermanentSessionData, 'timestamp' | 'version'>;
        sessionData = {
          ...data,
          timestamp: Date.now(),
          version: SESSION_VERSION
        };
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      console.log('✅ Permanent session saved');
    } catch (error) {
      console.error('❌ Failed to save permanent session:', error);
    }
  }

  static getSession(): PermanentSessionData {
    const defaultSession: PermanentSessionData = {
      userId: '',
      email: '',
      userRole: '',
      isLoggedIn: false
    };

    if (!this.isStorageAvailable()) {
      return defaultSession;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return defaultSession;
      }

      const sessionData: PermanentSessionData = JSON.parse(stored);

      // Check version compatibility
      if (sessionData.version !== SESSION_VERSION) {
        console.log('🔄 Session version mismatch, clearing old session');
        this.clearSession();
        return defaultSession;
      }

      // Check if session is expired
      if (sessionData.timestamp && this.isSessionExpired(sessionData.timestamp)) {
        console.log('⏰ Permanent session expired, clearing');
        this.clearSession();
        return defaultSession;
      }

      // Validate required fields
      if (!sessionData.userId || !sessionData.email || !sessionData.userRole) {
        console.log('⚠️ Invalid session data, clearing');
        this.clearSession();
        return defaultSession;
      }

      return sessionData;
    } catch (error) {
      console.error('❌ Failed to parse permanent session:', error);
      this.clearSession();
      return defaultSession;
    }
  }

  static isLoggedIn(): boolean {
    const session = this.getSession();
    return session.isLoggedIn && !!session.userId;
  }

  static clearSession(): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🧹 Permanent session cleared');
    } catch (error) {
      console.error('❌ Failed to clear permanent session:', error);
    }
  }

  static updateUserRole(newRole: string): void {
    const currentSession = this.getSession();
    if (currentSession.isLoggedIn) {
      this.saveSession({
        ...currentSession,
        userRole: newRole
      });
    }
  }

  static refreshTimestamp(): void {
    const currentSession = this.getSession();
    if (currentSession.isLoggedIn) {
      this.saveSession(currentSession);
    }
  }

  static getSessionInfo(): {
    isValid: boolean;
    timeToExpiry: number;
    userId: string | null;
    userRole: string | null;
  } {
    const session = this.getSession();
    
    if (!session.isLoggedIn || !session.timestamp) {
      return {
        isValid: false,
        timeToExpiry: 0,
        userId: null,
        userRole: null
      };
    }

    const now = Date.now();
    const expiryTime = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
    const timeToExpiry = Math.max(0, expiryTime - (now - session.timestamp));

    return {
      isValid: !this.isSessionExpired(session.timestamp),
      timeToExpiry,
      userId: session.userId,
      userRole: session.userRole
    };
  }
}
