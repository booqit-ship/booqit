
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
 * Robust notification service using dedicated notification_settings table
 * This service follows best practices for notification delivery
 */
export class RobustNotificationService {
  /**
   * Get notification settings for a user
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    console.log('🔔 ROBUST NOTIF: Getting settings for user:', userId);
    
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ ROBUST NOTIF: Error fetching settings:', error);
      return null;
    }

    if (!data) {
      console.log('❌ ROBUST NOTIF: No notification settings found for user:', userId);
      return null;
    }

    console.log('✅ ROBUST NOTIF: Found settings:', {
      user_id: data.user_id,
      has_fcm_token: !!data.fcm_token,
      notification_enabled: data.notification_enabled,
      failed_count: data.failed_notification_count
    });

    return data;
  }

  /**
   * Check if a user is eligible to receive notifications
   */
  static isEligibleForNotification(settings: NotificationSettings): boolean {
    if (!settings.notification_enabled) {
      console.log('🔕 ROBUST NOTIF: Notifications disabled for user:', settings.user_id);
      return false;
    }

    if (!settings.fcm_token) {
      console.log('❌ ROBUST NOTIF: No FCM token for user:', settings.user_id);
      return false;
    }

    // Skip if too many recent failures (basic circuit breaker)
    if (settings.failed_notification_count >= 5) {
      console.log('🚫 ROBUST NOTIF: Too many failures for user:', settings.user_id);
      return false;
    }

    return true;
  }

  /**
   * Send notification to a specific user
   */
  static async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('📤 ROBUST NOTIF: Sending to user:', userId);
      console.log('📤 ROBUST NOTIF: Payload:', payload);

      // Step 1: Get notification settings
      const settings = await this.getNotificationSettings(userId);
      
      if (!settings) {
        console.error('❌ ROBUST NOTIF: No notification settings found for user:', userId);
        console.error('❌ ROBUST NOTIF: This indicates a system/data issue - user should have settings');
        return false;
      }

      // Step 2: Check eligibility
      if (!this.isEligibleForNotification(settings)) {
        return false;
      }

      console.log('✅ ROBUST NOTIF: User eligible, sending notification...');

      // Step 3: Send via Edge Function
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data
        }
      });

      if (error) {
        console.error('❌ ROBUST NOTIF: Edge function error:', error);
        await this.recordFailure(userId, error.message);
        return false;
      }

      if (!data?.success) {
        console.error('❌ ROBUST NOTIF: Notification failed:', data?.error);
        await this.recordFailure(userId, data?.error || 'Unknown error');
        return false;
      }

      // Step 4: Record success
      await this.recordSuccess(userId);
      console.log('✅ ROBUST NOTIF: Sent successfully to user:', userId);
      return true;

    } catch (error: any) {
      console.error('❌ ROBUST NOTIF: Unexpected error:', error);
      await this.recordFailure(userId, error.message);
      return false;
    }
  }

  /**
   * Record successful notification
   */
  private static async recordSuccess(userId: string): Promise<void> {
    try {
      await supabase
        .from('notification_settings')
        .update({
          last_notification_sent: new Date().toISOString(),
          failed_notification_count: 0,
          last_failure_reason: null
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('❌ ROBUST NOTIF: Error recording success:', error);
    }
  }

  /**
   * Record notification failure
   */
  private static async recordFailure(userId: string, reason: string): Promise<void> {
    try {
      // Increment failure count and record reason
      const { data: current } = await supabase
        .from('notification_settings')
        .select('failed_notification_count')
        .eq('user_id', userId)
        .single();

      const failureCount = (current?.failed_notification_count || 0) + 1;

      await supabase
        .from('notification_settings')
        .update({
          failed_notification_count: failureCount,
          last_failure_reason: reason
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('❌ ROBUST NOTIF: Error recording failure:', error);
    }
  }

  /**
   * Initialize notification settings for a user (called during login/registration)
   */
  static async initializeUserSettings(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔧 ROBUST NOTIF: Initializing settings for user:', userId);

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken,
          notification_enabled: true,
          failed_notification_count: 0,
          last_failure_reason: null
        });

      if (error) {
        console.error('❌ ROBUST NOTIF: Error initializing settings:', error);
        return false;
      }

      console.log('✅ ROBUST NOTIF: Settings initialized for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ ROBUST NOTIF: Error during initialization:', error);
      return false;
    }
  }

  /**
   * Update FCM token for a user
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔑 ROBUST NOTIF: Updating FCM token for user:', userId);

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          fcm_token: fcmToken,
          notification_enabled: true,
          failed_notification_count: 0, // Reset on token update
          last_failure_reason: null
        });

      if (error) {
        console.error('❌ ROBUST NOTIF: Error updating FCM token:', error);
        return false;
      }

      console.log('✅ ROBUST NOTIF: FCM token updated for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ ROBUST NOTIF: Error during token update:', error);
      return false;
    }
  }
}

// Convenience functions for common notification types
export const sendBookingConfirmation = async (
  customerId: string,
  shopName: string,
  serviceNames: string,
  date: string,
  time: string,
  bookingId: string
) => {
  return RobustNotificationService.sendNotification(customerId, {
    title: '🎉 Booking Confirmed!',
    body: `Your appointment at ${shopName} for ${serviceNames} on ${date} at ${time} is confirmed!`,
    data: {
      type: 'booking_confirmed',
      bookingId
    }
  });
};

export const sendNewBookingAlert = async (
  merchantId: string,
  customerName: string,
  serviceNames: string,
  dateTime: string,
  bookingId: string
) => {
  return RobustNotificationService.sendNotification(merchantId, {
    title: 'New Booking! 📅',
    body: `${customerName} has booked ${serviceNames} for ${dateTime}`,
    data: {
      type: 'new_booking',
      bookingId
    }
  });
};

export const sendBookingCancellation = async (
  userId: string,
  message: string,
  bookingId: string
) => {
  return RobustNotificationService.sendNotification(userId, {
    title: 'Booking Cancelled',
    body: message,
    data: {
      type: 'booking_cancelled',
      bookingId
    }
  });
};

export const sendReviewReminder = async (
  customerId: string,
  shopName: string,
  bookingId: string
) => {
  return RobustNotificationService.sendNotification(customerId, {
    title: 'How was your visit? ⭐',
    body: `Hope you enjoyed your service at ${shopName}! Tap to leave a review.`,
    data: {
      type: 'review_request',
      bookingId
    }
  });
};
