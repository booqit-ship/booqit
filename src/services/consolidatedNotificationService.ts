
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationSettings {
  user_id: string;
  fcm_token: string | null;
  notification_enabled: boolean;
  last_notification_sent: string | null;
  failed_notification_count: number;
  last_failure_reason: string | null;
}

/**
 * Consolidated notification service - SINGLE SOURCE OF TRUTH
 * Uses ONLY notification_settings table for all FCM token operations
 */
export class ConsolidatedNotificationService {
  /**
   * Get notification settings from notification_settings table ONLY
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    console.log('🔔 CONSOLIDATED: Getting settings for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ CONSOLIDATED: Error fetching settings:', error);
        return null;
      }

      if (!data) {
        console.log('⚠️ CONSOLIDATED: No notification settings found for user:', userId);
        return null;
      }

      console.log('✅ CONSOLIDATED: Found settings:', {
        user_id: data.user_id,
        has_fcm_token: !!data.fcm_token,
        notification_enabled: data.notification_enabled,
        failed_count: data.failed_notification_count
      });

      return data;
    } catch (error) {
      console.error('❌ CONSOLIDATED: Unexpected error getting settings:', error);
      return null;
    }
  }

  /**
   * Update or create FCM token in notification_settings table ONLY
   * This ensures new devices always get their tokens updated
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔑 CONSOLIDATED: Force updating FCM token for user:', userId);
      console.log('🔑 CONSOLIDATED: Token preview:', fcmToken.substring(0, 30) + '...');

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken,
          notification_enabled: true,
          failed_notification_count: 0, // Reset on token update
          last_failure_reason: null
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ CONSOLIDATED: Error updating FCM token:', error);
        return false;
      }

      console.log('✅ CONSOLIDATED: FCM token force updated for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ CONSOLIDATED: Error during token update:', error);
      return false;
    }
  }

  /**
   * Send notification to user via edge function
   */
  static async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('📤 CONSOLIDATED: Sending to user:', userId);
      console.log('📤 CONSOLIDATED: Payload:', payload);

      // Get notification settings first
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings) {
        console.log('❌ CONSOLIDATED: No notification settings found for user:', userId);
        return false;
      }

      if (!settings.notification_enabled) {
        console.log('🔕 CONSOLIDATED: Notifications disabled for user:', userId);
        return false;
      }

      if (!settings.fcm_token) {
        console.log('❌ CONSOLIDATED: No FCM token for user:', userId);
        return false;
      }

      // Skip if too many recent failures (circuit breaker)
      if (settings.failed_notification_count >= 5) {
        console.log('🚫 CONSOLIDATED: Too many failures for user:', userId);
        return false;
      }

      console.log('✅ CONSOLIDATED: User eligible, sending notification...');

      // Send via Edge Function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: {
            userId,
            title: payload.title,
            body: payload.body,
            data: payload.data
          }
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ CONSOLIDATED: Edge function error:', error);
          await this.recordFailure(userId, error.message);
          return false;
        }

        if (!data?.success) {
          console.error('❌ CONSOLIDATED: Notification failed:', data?.error);
          await this.recordFailure(userId, data?.error || 'Unknown error');
          return false;
        }

        console.log('✅ CONSOLIDATED: Sent successfully to user:', userId);
        return true;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ CONSOLIDATED: Request timeout');
          await this.recordFailure(userId, 'Request timeout');
        } else {
          console.error('❌ CONSOLIDATED: Fetch error:', fetchError);
          await this.recordFailure(userId, fetchError.message);
        }
        return false;
      }

    } catch (error: any) {
      console.error('❌ CONSOLIDATED: Unexpected error:', error);
      await this.recordFailure(userId, error.message);
      return false;
    }
  }

  /**
   * Record notification failure
   */
  private static async recordFailure(userId: string, reason: string): Promise<void> {
    try {
      // Get current failure count
      const { data: current } = await supabase
        .from('notification_settings')
        .select('failed_notification_count')
        .eq('user_id', userId)
        .single();

      const failureCount = (current?.failed_notification_count || 0) + 1;

      await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          failed_notification_count: failureCount,
          last_failure_reason: reason
        });

    } catch (error) {
      console.error('❌ CONSOLIDATED: Error recording failure:', error);
    }
  }

  /**
   * Initialize notification settings for a user (called during login/registration)
   */
  static async initializeUserSettings(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔧 CONSOLIDATED: Initializing/updating settings for user:', userId);
      console.log('🔑 CONSOLIDATED: New FCM token length:', fcmToken.length);

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken,
          notification_enabled: true,
          failed_notification_count: 0,
          last_failure_reason: null
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ CONSOLIDATED: Error initializing settings:', error);
        return false;
      }

      console.log('✅ CONSOLIDATED: Settings initialized/updated for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ CONSOLIDATED: Error during initialization:', error);
      return false;
    }
  }

  /**
   * Check if FCM token needs to be refreshed
   */
  static async shouldRefreshToken(userId: string, currentToken: string): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings || !settings.fcm_token) {
        console.log('🔄 CONSOLIDATED: No existing token, needs refresh');
        return true;
      }

      if (settings.fcm_token !== currentToken) {
        console.log('🔄 CONSOLIDATED: Token changed, needs refresh');
        return true;
      }

      // If too many failures, try refreshing token
      if (settings.failed_notification_count >= 3) {
        console.log('🔄 CONSOLIDATED: Too many failures, needs refresh');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ CONSOLIDATED: Error checking token refresh:', error);
      return true; // Default to refresh on error
    }
  }
}
