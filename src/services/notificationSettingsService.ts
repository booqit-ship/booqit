
import { supabase } from '@/integrations/supabase/client';
import { MultiDeviceNotificationService } from './multiDeviceNotificationService';

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
 * Service for managing user notification settings with multi-device support
 */
export class NotificationSettingsService {
  /**
   * Get notification settings for the current user
   */
  static async getUserSettings(userId: string): Promise<UserNotificationSettings | null> {
    try {
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
   * Initialize notification settings for a new user with multi-device support
   */
  static async initializeForUser(userId: string, fcmToken?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for initialization');
        return false;
      }

      console.log('🔧 NOTIF SETTINGS: Initializing for authenticated user:', userId);

      // Initialize legacy notification_settings table
      const { error: settingsError } = await supabase
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

      if (settingsError) {
        console.error('❌ NOTIF SETTINGS: Error initializing legacy settings:', settingsError);
        return false;
      }

      // Register device token if provided
      if (fcmToken) {
        const deviceType = MultiDeviceNotificationService.getDeviceType();
        const deviceName = MultiDeviceNotificationService.getDeviceName();
        
        const deviceSuccess = await MultiDeviceNotificationService.registerDeviceToken(
          fcmToken,
          deviceType,
          deviceName
        );

        if (!deviceSuccess) {
          console.warn('⚠️ NOTIF SETTINGS: Failed to register device token, but legacy settings initialized');
        }
      }

      console.log('✅ NOTIF SETTINGS: Successfully initialized for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ NOTIF SETTINGS: Error in initializeForUser:', error);
      return false;
    }
  }

  /**
   * Update FCM token for user (legacy support, new tokens should use MultiDeviceNotificationService)
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for FCM token update');
        return false;
      }

      // Update legacy table
      const { error } = await supabase
        .from('notification_settings')
        .update({
          fcm_token: fcmToken,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating FCM token in legacy table:', error);
        return false;
      }

      // Also register as new device token
      const deviceType = MultiDeviceNotificationService.getDeviceType();
      const deviceName = MultiDeviceNotificationService.getDeviceName();
      
      await MultiDeviceNotificationService.registerDeviceToken(
        fcmToken,
        deviceType,
        deviceName
      );

      return true;
    } catch (error) {
      console.error('Error in updateFCMToken:', error);
      return false;
    }
  }

  /**
   * Clear FCM token (on logout) - clears all device tokens
   */
  static async clearFCMToken(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('User not authenticated or ID mismatch for FCM token clear');
        return false;
      }

      // Clear legacy table
      const { error: legacyError } = await supabase
        .from('notification_settings')
        .update({ 
          fcm_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (legacyError) {
        console.error('Error clearing FCM token from legacy table:', legacyError);
      }

      // Deactivate all device tokens
      const { error: deviceError } = await supabase
        .from('device_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (deviceError) {
        console.error('Error deactivating device tokens:', deviceError);
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
