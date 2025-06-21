
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
 * Consolidated notification service that handles all notification operations
 */
export class ConsolidatedNotificationService {
  /**
   * Send notification to a specific user
   */
  static async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('📤 CONSOLIDATED NOTIF: Sending to user:', userId);
      console.log('📤 CONSOLIDATED NOTIF: Payload:', payload);

      // Send via Edge Function
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data
        }
      });

      if (error) {
        console.error('❌ CONSOLIDATED NOTIF: Edge function error:', error);
        return false;
      }

      if (!data?.success) {
        console.error('❌ CONSOLIDATED NOTIF: Notification failed:', data?.error);
        return false;
      }

      console.log('✅ CONSOLIDATED NOTIF: Sent successfully to user:', userId);
      return true;
    } catch (error: any) {
      console.error('❌ CONSOLIDATED NOTIF: Unexpected error:', error);
      return false;
    }
  }

  /**
   * Initialize notification settings for a user
   */
  static async initializeUserSettings(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔧 CONSOLIDATED NOTIF: Initializing settings for user:', userId);

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
        console.error('❌ CONSOLIDATED NOTIF: Error initializing settings:', error);
        return false;
      }

      console.log('✅ CONSOLIDATED NOTIF: Settings initialized for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ CONSOLIDATED NOTIF: Error during initialization:', error);
      return false;
    }
  }

  /**
   * Update FCM token for a user
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔑 CONSOLIDATED NOTIF: Updating FCM token for user:', userId);

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
        console.error('❌ CONSOLIDATED NOTIF: Error updating FCM token:', error);
        return false;
      }

      console.log('✅ CONSOLIDATED NOTIF: FCM token updated for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ CONSOLIDATED NOTIF: Error during token update:', error);
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
  return ConsolidatedNotificationService.sendNotification(customerId, {
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
  return ConsolidatedNotificationService.sendNotification(merchantId, {
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
  return ConsolidatedNotificationService.sendNotification(userId, {
    title: 'Booking Cancelled',
    body: message,
    data: {
      type: 'booking_cancelled',
      bookingId
    }
  });
};
