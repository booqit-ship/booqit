
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
  }

  /**
   * Update notification enabled status
   */
  static async updateNotificationEnabled(userId: string, enabled: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('notification_settings')
      .update({ notification_enabled: enabled })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating notification enabled status:', error);
      return false;
    }

    return true;
  }

  /**
   * Initialize notification settings for a new user
   */
  static async initializeForUser(userId: string, fcmToken?: string): Promise<boolean> {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        fcm_token: fcmToken || null,
        notification_enabled: true,
        failed_notification_count: 0
      });

    if (error) {
      console.error('Error initializing notification settings:', error);
      return false;
    }

    return true;
  }

  /**
   * Update FCM token for user
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    return RobustNotificationService.updateFCMToken(userId, fcmToken);
  }

  /**
   * Clear FCM token (on logout)
   */
  static async clearFCMToken(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notification_settings')
      .update({ fcm_token: null })
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing FCM token:', error);
      return false;
    }

    return true;
  }

  /**
   * Reset failure count (for admin/debugging)
   */
  static async resetFailureCount(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notification_settings')
      .update({ 
        failed_notification_count: 0,
        last_failure_reason: null
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting failure count:', error);
      return false;
    }

    return true;
  }
}
