
// PERMANENT session management - once logged in, stay logged in FOREVER
export class PermanentSession {
  private static readonly SESSION_KEY = 'booqit-permanent-session';
  private static readonly USER_ROLE_KEY = 'booqit-user-role';
  private static readonly USER_ID_KEY = 'booqit-user-id';
  private static readonly LOGGED_IN_KEY = 'booqit-logged-in';

  // Save session permanently - NEVER expires
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
      
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(this.USER_ROLE_KEY, userRole);
      localStorage.setItem(this.USER_ID_KEY, userId);
      localStorage.setItem(this.LOGGED_IN_KEY, 'true');
      
      console.log('💾 Session saved permanently - will persist across all tab switches and app restarts');
    } catch (error) {
      console.error('❌ Failed to save permanent session:', error);
    }
  }

  // Get session - ALWAYS returns cached session if exists
  static getSession(): {
    isLoggedIn: boolean;
    session: any | null;
    userRole: string | null;
    userId: string | null;
  } {
    try {
      const isLoggedIn = localStorage.getItem(this.LOGGED_IN_KEY) === 'true';
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      const userRole = localStorage.getItem(this.USER_ROLE_KEY);
      const userId = localStorage.getItem(this.USER_ID_KEY);

      if (isLoggedIn && sessionData && userRole && userId) {
        const session = JSON.parse(sessionData);
        console.log('⚡ Using permanent cached session - no expiration checks');
        return {
          isLoggedIn: true,
          session,
          userRole,
          userId
        };
      }

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

  // Clear session only on manual logout
  static clearSession() {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.USER_ROLE_KEY);
      localStorage.removeItem(this.USER_ID_KEY);
      localStorage.removeItem(this.LOGGED_IN_KEY);
      console.log('🗑️ Permanent session cleared - user manually logged out');
    } catch (error) {
      console.error('❌ Failed to clear permanent session:', error);
    }
  }

  // Check if user is permanently logged in
  static isLoggedIn(): boolean {
    return localStorage.getItem(this.LOGGED_IN_KEY) === 'true';
  }
}
