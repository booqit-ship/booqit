
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export class SessionManager {
  private static readonly SESSION_BACKUP_KEY = 'booqit-session-backup';
  private static readonly LAST_ACTIVITY_KEY = 'booqit-last-activity';
  private static refreshPromise: Promise<any> | null = null;

  // Save session backup
  static saveSessionBackup(session: Session | null) {
    try {
      if (session) {
        localStorage.setItem(this.SESSION_BACKUP_KEY, JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user,
          timestamp: Date.now()
        }));
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
      } else {
        localStorage.removeItem(this.SESSION_BACKUP_KEY);
        localStorage.removeItem(this.LAST_ACTIVITY_KEY);
      }
    } catch (error) {
      console.error('Failed to save session backup:', error);
    }
  }

  // Get session backup
  static getSessionBackup(): any | null {
    try {
      const backup = localStorage.getItem(this.SESSION_BACKUP_KEY);
      if (!backup) return null;
      
      const parsed = JSON.parse(backup);
      const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
      
      // Check if backup is too old (24 hours)
      if (lastActivity && Date.now() - parseInt(lastActivity) > 24 * 60 * 60 * 1000) {
        this.clearSessionBackup();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to get session backup:', error);
      return null;
    }
  }

  // Clear session backup
  static clearSessionBackup() {
    try {
      localStorage.removeItem(this.SESSION_BACKUP_KEY);
      localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    } catch (error) {
      console.error('Failed to clear session backup:', error);
    }
  }

  // Controlled session refresh to prevent conflicts
  static async refreshSession(): Promise<{ session: Session | null; error: any }> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log('Session refresh already in progress, waiting...');
      return await this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    
    return result;
  }

  private static async performRefresh(): Promise<{ session: Session | null; error: any }> {
    try {
      console.log('Attempting controlled session refresh...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        
        // If refresh fails, try to restore from backup
        const backup = this.getSessionBackup();
        if (backup && backup.refresh_token) {
          console.log('Attempting session restore from backup...');
          
          const { data: restoreData, error: restoreError } = await supabase.auth.setSession({
            access_token: backup.access_token,
            refresh_token: backup.refresh_token
          });
          
          if (!restoreError && restoreData.session) {
            console.log('Session restored from backup successfully');
            this.saveSessionBackup(restoreData.session);
            return { session: restoreData.session, error: null };
          }
        }
        
        // If all fails, clear everything
        this.clearSessionBackup();
        return { session: null, error };
      }
      
      if (data.session) {
        console.log('Session refreshed successfully');
        this.saveSessionBackup(data.session);
      }
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('Exception during session refresh:', error);
      this.refreshPromise = null;
      return { session: null, error };
    }
  }

  // Update last activity
  static updateActivity() {
    try {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  // Check if session needs refresh (5 minutes before expiry)
  static needsRefresh(session: Session | null): boolean {
    if (!session || !session.expires_at) return false;
    
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    
    return expiresAt < fiveMinutesFromNow;
  }
}
