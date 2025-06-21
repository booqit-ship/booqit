
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
        console.error('Edge function error:', error);
        return false;
      }

      if (!data?.success) {
        console.error('Notification failed:', data?.error);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Unexpected notification error:', error);
      return false;
    }
  }

  /**
   * Initialize notification settings for a user
   */
  static async initializeUserSettings(userId: string, fcmToken: string): Promise<boolean> {
    try {
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
        console.error('Error initializing settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error during initialization:', error);
      return false;
    }
  }

  /**
   * Update FCM token for a user
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
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
        console.error('Error updating FCM token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error during token update:', error);
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
  merchantUserId: string,
  customerName: string,
  serviceNames: string,
  dateTime: string,
  bookingId: string
) => {
  return ConsolidatedNotificationService.sendNotification(merchantUserId, {
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
