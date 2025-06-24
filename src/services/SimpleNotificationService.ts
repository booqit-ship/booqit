
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

      // Get all active device tokens for the user with enhanced debugging
      console.log('🔍 SIMPLE: Querying device_tokens table for user:', userId);
      
      const { data: deviceTokens, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      console.log('🔍 SIMPLE: Database query result:', { 
        error: error?.message, 
        tokenCount: deviceTokens?.length || 0,
        tokens: deviceTokens?.map(t => ({ type: t.device_type, name: t.device_name })) || []
      });

      if (error) {
        console.error('❌ SIMPLE: Error fetching device tokens:', error);
        
        // Try fallback query without RLS constraints for debugging
        console.log('🔍 SIMPLE: Attempting fallback query with service role...');
        const { data: fallbackTokens, error: fallbackError } = await supabase
          .rpc('get_user_device_tokens', { p_user_id: userId });
        
        console.log('🔍 SIMPLE: Fallback query result:', { 
          error: fallbackError?.message, 
          tokenCount: fallbackTokens?.length || 0 
        });
        
        if (fallbackError || !fallbackTokens || fallbackTokens.length === 0) {
          return false;
        }
        
        // Use fallback tokens if available
        const convertedTokens = fallbackTokens.map((token: any) => ({
          fcm_token: token.fcm_token,
          device_type: token.device_type,
          device_name: token.device_name
        }));
        
        return this.sendToDevices(convertedTokens, userId, title, body, data);
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log('⚠️ SIMPLE: No device tokens found for user:', userId);
        return false;
      }

      console.log(`📱 SIMPLE: Found ${deviceTokens.length} devices for user:`, userId);
      return this.sendToDevices(deviceTokens, userId, title, body, data);
      
    } catch (error) {
      console.error('❌ SIMPLE: Error in sendNotification:', error);
      return false;
    }
  }

  /**
   * Send notifications to multiple devices
   */
  private static async sendToDevices(
    deviceTokens: any[],
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>
  ): Promise<boolean> {
    let successCount = 0;
    const invalidTokens: string[] = [];

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
          
          // Check if it's an invalid token error
          if (sendError?.message?.includes('UNREGISTERED') || 
              sendError?.message?.includes('invalid') ||
              response?.error?.includes('UNREGISTERED') ||
              response?.error?.includes('invalid')) {
            invalidTokens.push(device.fcm_token);
          }
        }
      } catch (deviceError: any) {
        console.error('❌ SIMPLE: Error sending to device:', device.device_type, deviceError);
        
        // Check if it's an invalid token error in the catch block too
        if (deviceError?.message?.includes('UNREGISTERED') || 
            deviceError?.message?.includes('invalid')) {
          invalidTokens.push(device.fcm_token);
        }
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      console.log('🧹 SIMPLE: Cleaning up invalid tokens:', invalidTokens.length);
      await this.cleanupInvalidTokens(invalidTokens);
    }

    console.log(`📊 SIMPLE: Notification sent to ${successCount}/${deviceTokens.length} devices`);
    return successCount > 0;
  }

  /**
   * Clean up invalid tokens
   */
  private static async cleanupInvalidTokens(tokens: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .in('fcm_token', tokens);
      
      if (error) {
        console.error('❌ SIMPLE: Error cleaning up invalid tokens:', error);
      } else {
        console.log('✅ SIMPLE: Cleaned up invalid tokens');
      }
    } catch (error) {
      console.error('❌ SIMPLE: Error in token cleanup:', error);
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
