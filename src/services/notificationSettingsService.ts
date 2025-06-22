
import { supabase } from '@/integrations/supabase/client';
import { RobustNotificationService } from './robustNotificationService';

export interface UserNotificationSettings {
  user_id: string;
  fcm_token: string | null;
  notification_enabled: boolean;
  last_notification_sent: string | null;
  failed_notification_count: number;
  last_failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing user notification settings
 */
export class NotificationSettingsService {
  /**
   * Get notification settings for the current user
   */
  static async getUserSettings(userId: string): Promise<UserNotificationSettings | null> {
    try {
      // Ensure user is authenticated before attempting to fetch
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch');
        return null;
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      return null;
    }
  }

  /**
   * Update notification enabled status
   */
  static async updateNotificationEnabled(userId: string, enabled: boolean): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch');
        return false;
      }

      const { error } = await supabase
        .from('notification_settings')
        .update({ 
          notification_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating notification enabled status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateNotificationEnabled:', error);
      return false;
    }
  }

  /**
   * Initialize notification settings for a new user
   */
  static async initializeForUser(userId: string, fcmToken?: string): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for initialization');
        return false;
      }

      console.log('🔧 NOTIF SETTINGS: Initializing for authenticated user:', userId);

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken || null,
          notification_enabled: true,
          failed_notification_count: 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ NOTIF SETTINGS: Error initializing:', error);
        return false;
      }

      console.log('✅ NOTIF SETTINGS: Successfully initialized for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ NOTIF SETTINGS: Error in initializeForUser:', error);
      return false;
    }
  }

  /**
   * Update FCM token for user
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for FCM token update');
        return false;
      }

      return RobustNotificationService.updateFCMToken(userId, fcmToken);
    } catch (error) {
      console.error('Error in updateFCMToken:', error);
      return false;
    }
  }

  /**
   * Clear FCM token (on logout)
   */
  static async clearFCMToken(userId: string): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for FCM token clear');
        return false;
      }

      const { error } = await supabase
        .from('notification_settings')
        .update({ 
          fcm_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing FCM token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearFCMToken:', error);
      return false;
    }
  }

  /**
   * Reset failure count (for admin/debugging)
   */
  static async resetFailureCount(userId: string): Promise<boolean> {
    try {
      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch');
        return false;
      }

      const { error } = await supabase
        .from('notification_settings')
        .update({ 
          failed_notification_count: 0,
          last_failure_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting failure count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in resetFailureCount:', error);
      return false;
    }
  }
}
