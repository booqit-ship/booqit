
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
 * Consolidated notification service that handles all notification operations with multi-device support
 */
export class ConsolidatedNotificationService {
  /**
   * Send notification to all user's devices
   */
  static async sendToAllUserDevices(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      console.log('📤 CONSOLIDATED: Sending notification to all devices for user:', userId);

      // Get all active device tokens for the user
      const { data: deviceTokens, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ CONSOLIDATED: Error fetching device tokens:', error);
        // Fallback to single notification
        return this.sendNotificationLegacy(userId, payload);
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log('⚠️ CONSOLIDATED: No device tokens found, trying legacy method');
        // Fallback to legacy notification_settings table
        return this.sendNotificationLegacy(userId, payload);
      }

      console.log(`📱 CONSOLIDATED: Found ${deviceTokens.length} devices for user:`, userId);

      // Send notification to each device token
      const results = [];
      for (const device of deviceTokens) {
        try {
          const { data, error } = await supabase.functions.invoke('send-notification', {
            body: {
              userId,
              title: payload.title,
              body: payload.body,
              data: {
                ...payload.data,
                device_type: device.device_type,
                device_name: device.device_name
              },
              fcm_token: device.fcm_token // Direct token for multi-device
            }
          });

          results.push({
            device_type: device.device_type,
            device_name: device.device_name,
            success: !error && data?.success,
            error: error?.message || (!data?.success ? data?.error : null)
          });

          if (error || !data?.success) {
            console.error('❌ CONSOLIDATED: Failed to send to device:', device.device_type, error || data?.error);
          } else {
            console.log('✅ CONSOLIDATED: Sent to device:', device.device_type, device.device_name);
          }
        } catch (deviceError) {
          console.error('❌ CONSOLIDATED: Error sending to device:', device.device_type, deviceError);
          results.push({
            device_type: device.device_type,
            device_name: device.device_name,
            success: false,
            error: deviceError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📊 CONSOLIDATED: Notification sent to ${successCount}/${results.length} devices`);

      return {
        success: successCount > 0,
        results
      };
    } catch (error) {
      console.error('❌ CONSOLIDATED: Error in sendToAllUserDevices:', error);
      // Final fallback to legacy method
      return this.sendNotificationLegacy(userId, payload);
    }
  }

  /**
   * Legacy single notification method (fallback)
   */
  private static async sendNotificationLegacy(userId: string, payload: NotificationPayload): Promise<{ success: boolean; results: any[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data
        }
      });

      if (error) {
        console.error('❌ CONSOLIDATED: Legacy notification error:', error);
        return { success: false, results: [] };
      }

      if (!data?.success) {
        console.error('❌ CONSOLIDATED: Legacy notification failed:', data?.error);
        return { success: false, results: [] };
      }

      return { 
        success: true, 
        results: [{ device_type: 'legacy', success: true }] 
      };
    } catch (error) {
      console.error('❌ CONSOLIDATED: Legacy notification error:', error);
      return { success: false, results: [] };
    }
  }

  /**
   * Send notification to a specific user (uses multi-device by default)
   */
  static async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    const result = await this.sendToAllUserDevices(userId, payload);
    return result.success;
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

// Enhanced convenience functions for booking notifications
export const sendBookingConfirmation = async (
  customerId: string,
  shopName: string,
  serviceNames: string,
  date: string,
  time: string,
  bookingId: string
) => {
  return ConsolidatedNotificationService.sendToAllUserDevices(customerId, {
    title: '🎉 Booking Confirmed!',
    body: `Your appointment at ${shopName} for ${serviceNames} on ${date} at ${time} is confirmed!`,
    data: {
      type: 'booking_confirmed',
      bookingId,
      shopName,
      serviceNames,
      date,
      time
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
  return ConsolidatedNotificationService.sendToAllUserDevices(merchantUserId, {
    title: '📅 New Booking!',
    body: `${customerName} has booked ${serviceNames} for ${dateTime}`,
    data: {
      type: 'new_booking',
      bookingId,
      customerName,
      serviceNames,
      dateTime
    }
  });
};

export const sendBookingCancellation = async (
  userId: string,
  message: string,
  bookingId: string,
  isMerchant: boolean = false
) => {
  return ConsolidatedNotificationService.sendToAllUserDevices(userId, {
    title: isMerchant ? '❌ Booking Cancelled' : '😔 Booking Cancelled',
    body: message,
    data: {
      type: 'booking_cancelled',
      bookingId,
      isMerchant
    }
  });
};

export const sendBookingCompletedReviewRequest = async (
  customerId: string,
  merchantName: string,
  bookingId: string
) => {
  return ConsolidatedNotificationService.sendToAllUserDevices(customerId, {
    title: '⭐ How was your visit?',
    body: `Hope you enjoyed your service at ${merchantName}! Tap to leave a review and help others discover great service.`,
    data: {
      type: 'booking_completed',
      bookingId,
      merchantName,
      action: 'review'
    }
  });
};
