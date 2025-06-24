
import { supabase } from '@/integrations/supabase/client';

interface NotificationResponse {
  success: boolean;
  results: Array<{
    device_type: string;
    device_name?: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Consolidated notification service that sends to all user devices
 */
export class ConsolidatedNotificationService {
  private static readonly EDGE_FUNCTION_URL = 'https://ggclvurfcykbwmhfftkn.supabase.co/functions/v1/send-notification';

  /**
   * Send notification to all devices for a user
   */
  static async sendToAllDevices(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<NotificationResponse> {
    try {
      console.log('📤 CONSOLIDATED: Sending notification to all devices for user:', userId);
      console.log('📋 CONSOLIDATED: Notification details:', { title, body, data });

      // Get all active device tokens for the user
      const { data: deviceTokens, error: deviceError } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (deviceError) {
        console.error('❌ CONSOLIDATED: Error fetching device tokens:', deviceError);
        throw deviceError;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.warn('⚠️ CONSOLIDATED: No device tokens found, trying legacy method');
        
        // Fallback to legacy notification_settings table
        const { data: legacySettings } = await supabase
          .from('notification_settings')
          .select('fcm_token')
          .eq('user_id', userId)
          .eq('notification_enabled', true)
          .single();

        if (legacySettings?.fcm_token) {
          console.log('🔄 CONSOLIDATED: Using legacy FCM token');
          const result = await this.sendSingleNotification(
            userId,
            title,
            body,
            data,
            legacySettings.fcm_token
          );
          
          return {
            success: result.success,
            results: [{
              device_type: 'unknown',
              device_name: 'Legacy Device',
              success: result.success,
              error: result.error
            }]
          };
        }

        return {
          success: false,
          results: []
        };
      }

      console.log(`📱 CONSOLIDATED: Found ${deviceTokens.length} devices for user: ${userId}`);

      // Send notification to each device
      const results = await Promise.allSettled(
        deviceTokens.map(async (device) => {
          console.log(`📤 CONSOLIDATED: Sending to device: ${device.device_type} ${device.device_name || 'Unknown'}`);
          
          const result = await this.sendSingleNotification(
            userId,
            title,
            body,
            { ...data, device_type: device.device_type, device_name: device.device_name },
            device.fcm_token
          );

          return {
            device_type: device.device_type,
            device_name: device.device_name,
            success: result.success,
            error: result.error
          };
        })
      );

      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          const success = result.value.success;
          console.log(`${success ? '✅' : '❌'} CONSOLIDATED: ${success ? 'Sent to' : 'Failed for'} device: ${deviceTokens[index].device_type} ${deviceTokens[index].device_name || 'Unknown'}`);
          return result.value;
        } else {
          console.error(`❌ CONSOLIDATED: Promise rejected for device ${index}:`, result.reason);
          return {
            device_type: deviceTokens[index]?.device_type || 'unknown',
            device_name: deviceTokens[index]?.device_name,
            success: false,
            error: String(result.reason)
          };
        }
      });

      const successCount = processedResults.filter(r => r.success).length;
      const totalCount = processedResults.length;

      console.log(`📊 CONSOLIDATED: Notification sent to ${successCount}/${totalCount} devices`);

      return {
        success: successCount > 0,
        results: processedResults
      };

    } catch (error) {
      console.error('❌ CONSOLIDATED: Error sending notifications:', error);
      return {
        success: false,
        results: []
      };
    }
  }

  /**
   * Send notification to a single device
   */
  private static async sendSingleNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>,
    fcmToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚀 CONSOLIDATED: Sending single notification to token: ${fcmToken.substring(0, 30)}...`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session');
      }

      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          title,
          body,
          data,
          fcm_token: fcmToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CONSOLIDATED: Edge function error:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      console.log('✅ CONSOLIDATED: Single notification result:', result);

      return { success: true };
    } catch (error) {
      console.error('❌ CONSOLIDATED: Error sending single notification:', error);
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Send booking confirmation notification to customer
 */
export async function sendBookingConfirmation(
  customerId: string,
  merchantName: string,
  serviceName: string,
  date: string,
  time: string,
  bookingId: string
): Promise<NotificationResponse> {
  return ConsolidatedNotificationService.sendToAllDevices(
    customerId,
    '🎉 Booking Confirmed!',
    `Your appointment at ${merchantName} for ${serviceName} on ${date} at ${time} is confirmed!`,
    {
      type: 'booking_confirmed',
      bookingId,
      shopName: merchantName,
      serviceNames: serviceName,
      date,
      time
    }
  );
}

/**
 * Send new booking alert to merchant
 */
export async function sendNewBookingAlert(
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  dateTime: string,
  bookingId: string
): Promise<NotificationResponse> {
  return ConsolidatedNotificationService.sendToAllDevices(
    merchantUserId,
    '📅 New Booking!',
    `${customerName} has booked ${serviceName} for ${dateTime}`,
    {
      type: 'new_booking',
      bookingId,
      customerName,
      serviceNames: serviceName,
      dateTime
    }
  );
}

/**
 * Send booking cancellation notification
 */
export async function sendBookingCancellation(
  userId: string,
  message: string,
  bookingId: string,
  isMerchant: boolean = false
): Promise<NotificationResponse> {
  return ConsolidatedNotificationService.sendToAllDevices(
    userId,
    '❌ Booking Cancelled',
    message,
    {
      type: 'booking_cancelled',
      bookingId,
      isMerchant
    }
  );
}

/**
 * Send booking completion review request to customer
 */
export async function sendBookingCompletedReviewRequest(
  customerId: string,
  merchantName: string,
  bookingId: string
): Promise<NotificationResponse> {
  return ConsolidatedNotificationService.sendToAllDevices(
    customerId,
    '⭐ How was your visit?',
    `Hope you enjoyed your service at ${merchantName}! Tap to leave a review.`,
    {
      type: 'booking_completed',
      bookingId,
      merchantName
    }
  );
}
