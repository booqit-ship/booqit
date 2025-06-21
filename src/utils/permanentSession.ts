
// BULLETPROOF session management - once logged in, stay logged in FOREVER until manual logout
export class PermanentSession {
  private static readonly SESSION_KEY = 'booqit-permanent-session';
  private static readonly USER_ROLE_KEY = 'booqit-user-role';
  private static readonly USER_ID_KEY = 'booqit-user-id';
  private static readonly LOGGED_IN_KEY = 'booqit-logged-in';

  // Save session permanently - NEVER expires, NEVER validates
  static saveSession(session: any, userRole: string, userId: string) {
    try {
      const sessionData = {
        user_id: userId,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
        saved_at: Date.now()
      };
      
      // Save to BOTH localStorage and sessionStorage for maximum persistence
      const dataStr = JSON.stringify(sessionData);
      localStorage.setItem(this.SESSION_KEY, dataStr);
      sessionStorage.setItem(this.SESSION_KEY, dataStr);
      
      localStorage.setItem(this.USER_ROLE_KEY, userRole);
      sessionStorage.setItem(this.USER_ROLE_KEY, userRole);
      
      localStorage.setItem(this.USER_ID_KEY, userId);
      sessionStorage.setItem(this.USER_ID_KEY, userId);
      
      localStorage.setItem(this.LOGGED_IN_KEY, 'true');
      sessionStorage.setItem(this.LOGGED_IN_KEY, 'true');
      
      console.log('💾 BULLETPROOF: Session saved to both storages - will NEVER expire');
    } catch (error) {
      console.error('❌ Failed to save permanent session:', error);
    }
  }

  // Get session - ALWAYS returns cached session if ANY storage has it
  static getSession(): {
    isLoggedIn: boolean;
    session: any | null;
    userRole: string | null;
    userId: string | null;
  } {
    try {
      // Check localStorage first
      let isLoggedIn = localStorage.getItem(this.LOGGED_IN_KEY) === 'true';
      let sessionData = localStorage.getItem(this.SESSION_KEY);
      let userRole = localStorage.getItem(this.USER_ROLE_KEY);
      let userId = localStorage.getItem(this.USER_ID_KEY);

      // If not found in localStorage, check sessionStorage
      if (!isLoggedIn || !sessionData || !userRole || !userId) {
        isLoggedIn = sessionStorage.getItem(this.LOGGED_IN_KEY) === 'true';
        sessionData = sessionStorage.getItem(this.SESSION_KEY);
        userRole = sessionStorage.getItem(this.USER_ROLE_KEY);
        userId = sessionStorage.getItem(this.USER_ID_KEY);
      }

      if (isLoggedIn && sessionData && userRole && userId) {
        const session = JSON.parse(sessionData);
        console.log('⚡ BULLETPROOF: Using permanent session - NO validation, NO expiration');
        return {
          isLoggedIn: true,
          session,
          userRole,
          userId
        };
      }

      console.log('📭 BULLETPROOF: No permanent session found');
      return {
        isLoggedIn: false,
        session: null,
        userRole: null,
        userId: null
      };
    } catch (error) {
      console.error('❌ Failed to get permanent session:', error);
      return {
        isLoggedIn: false,
        session: null,
        userRole: null,
        userId: null
      };
    }
  }

  // Clear session ONLY on manual logout
  static clearSession() {
    try {
      // Clear from BOTH storages
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.USER_ROLE_KEY);
      localStorage.removeItem(this.USER_ID_KEY);
      localStorage.removeItem(this.LOGGED_IN_KEY);
      
      sessionStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem(this.USER_ROLE_KEY);
      sessionStorage.removeItem(this.USER_ID_KEY);
      sessionStorage.removeItem(this.LOGGED_IN_KEY);
      
      console.log('🗑️ BULLETPROOF: Permanent session cleared from all storages');
    } catch (error) {
      console.error('❌ Failed to clear permanent session:', error);
    }
  }

  // Check if user is permanently logged in
  static isLoggedIn(): boolean {
    const localStorageCheck = localStorage.getItem(this.LOGGED_IN_KEY) === 'true';
    const sessionStorageCheck = sessionStorage.getItem(this.LOGGED_IN_KEY) === 'true';
    return localStorageCheck || sessionStorageCheck;
  }

  // Sync data between storages
  static syncStorages() {
    try {
      const localData = this.getSession();
      if (localData.isLoggedIn && localData.session && localData.userRole && localData.userId) {
        // Ensure both storages have the data
        this.saveSession(localData.session, localData.userRole, localData.userId);
      }
    } catch (error) {
      console.error('❌ Failed to sync storages:', error);
    }
  }
}
