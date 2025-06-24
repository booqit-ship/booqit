
import { supabase } from '@/integrations/supabase/client';

/**
 * Simple notification service - one service to handle all notifications
 */
export class SimpleNotificationService {
  /**
   * Send notification to all user's devices
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      console.log('📤 SIMPLE: Sending notification to user:', userId);
      console.log('📋 SIMPLE: Notification:', { title, body, data });

      // Get all active device tokens for the user
      const { data: deviceTokens, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ SIMPLE: Error fetching device tokens:', error);
        return false;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log('⚠️ SIMPLE: No device tokens found for user:', userId);
        return false;
      }

      console.log(`📱 SIMPLE: Found ${deviceTokens.length} devices for user:`, userId);

      // Send to each device
      let successCount = 0;
      for (const device of deviceTokens) {
        try {
          const { data: response, error: sendError } = await supabase.functions.invoke('send-notification', {
            body: {
              userId,
              title,
              body,
              data,
              fcm_token: device.fcm_token
            }
          });

          if (!sendError && response?.success) {
            successCount++;
            console.log('✅ SIMPLE: Sent to device:', device.device_type, device.device_name);
          } else {
            console.error('❌ SIMPLE: Failed to send to device:', device.device_type, sendError || response?.error);
          }
        } catch (deviceError) {
          console.error('❌ SIMPLE: Error sending to device:', device.device_type, deviceError);
        }
      }

      console.log(`📊 SIMPLE: Notification sent to ${successCount}/${deviceTokens.length} devices`);
      return successCount > 0;
    } catch (error) {
      console.error('❌ SIMPLE: Error in sendNotification:', error);
      return false;
    }
  }

  /**
   * Send notification to merchant when customer makes payment
   */
  static async notifyMerchantOfNewBooking(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('📅 SIMPLE: Notifying merchant of new booking');
    return this.sendNotification(
      merchantUserId,
      '📅 New Booking!',
      `${customerName} has booked ${serviceName} for ${dateTime}`,
      {
        type: 'new_booking',
        bookingId,
        customerName,
        serviceName,
        dateTime
      }
    );
  }

  /**
   * Send notification to customer when booking is confirmed
   */
  static async notifyCustomerBookingConfirmed(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('🎉 SIMPLE: Notifying customer of booking confirmation');
    return this.sendNotification(
      customerId,
      '🎉 Booking Confirmed!',
      `Your appointment at ${shopName} for ${serviceName} on ${dateTime} is confirmed!`,
      {
        type: 'booking_confirmed',
        bookingId,
        shopName,
        serviceName,
        dateTime
      }
    );
  }

  /**
   * Send notification to customer when booking is completed
   */
  static async notifyCustomerBookingCompleted(
    customerId: string,
    shopName: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('⭐ SIMPLE: Notifying customer of booking completion');
    return this.sendNotification(
      customerId,
      '⭐ How was your visit?',
      `Hope you enjoyed your service at ${shopName}! Tap to leave a review.`,
      {
        type: 'booking_completed',
        bookingId,
        shopName
      }
    );
  }

  /**
   * Send notification when booking is cancelled
   */
  static async notifyBookingCancelled(
    userId: string,
    message: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('❌ SIMPLE: Notifying of booking cancellation');
    return this.sendNotification(
      userId,
      '❌ Booking Cancelled',
      message,
      {
        type: 'booking_cancelled',
        bookingId
      }
    );
  }
}
