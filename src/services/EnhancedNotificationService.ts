
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced notification service with cross-user support and all booking scenarios
 */
export class EnhancedNotificationService {
  /**
   * Get notification tokens for a user (with cross-user permission checking)
   */
  private static async getNotificationTokens(userId: string): Promise<any[]> {
    try {
      // Use direct query with RLS instead of RPC since RPC doesn't exist in types
      const { data, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('❌ ENHANCED: Error fetching tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ ENHANCED: Error in getNotificationTokens:', error);
      return [];
    }
  }

  /**
   * Send notification to all user's devices
   */
  private static async sendToAllDevices(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      console.log('📤 ENHANCED: Sending notification to user:', userId);
      console.log('📋 ENHANCED: Notification:', { title, body, data });

      const tokens = await this.getNotificationTokens(userId);
      
      if (tokens.length === 0) {
        console.log('⚠️ ENHANCED: No device tokens found for user:', userId);
        return false;
      }

      console.log(`📱 ENHANCED: Found ${tokens.length} devices for user:`, userId);

      let successCount = 0;
      const invalidTokens: string[] = [];

      for (const device of tokens) {
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
            console.log('✅ ENHANCED: Sent to device:', device.device_type, device.device_name);
          } else {
            console.error('❌ ENHANCED: Failed to send to device:', device.device_type, sendError || response?.error);
            
            // Check if it's an invalid token error
            if (sendError?.message?.includes('UNREGISTERED') || 
                sendError?.message?.includes('invalid') ||
                response?.error?.includes('UNREGISTERED') ||
                response?.error?.includes('invalid')) {
              invalidTokens.push(device.fcm_token);
            }
          }
        } catch (deviceError: any) {
          console.error('❌ ENHANCED: Error sending to device:', device.device_type, deviceError);
          
          if (deviceError?.message?.includes('UNREGISTERED') || 
              deviceError?.message?.includes('invalid')) {
            invalidTokens.push(device.fcm_token);
          }
        }
      }

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        console.log('🧹 ENHANCED: Cleaning up invalid tokens:', invalidTokens.length);
        await this.cleanupInvalidTokens(invalidTokens);
      }

      console.log(`📊 ENHANCED: Notification sent to ${successCount}/${tokens.length} devices`);
      return successCount > 0;
    } catch (error) {
      console.error('❌ ENHANCED: Error in sendToAllDevices:', error);
      return false;
    }
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
        console.error('❌ ENHANCED: Error cleaning up invalid tokens:', error);
      } else {
        console.log('✅ ENHANCED: Cleaned up invalid tokens');
      }
    } catch (error) {
      console.error('❌ ENHANCED: Error in token cleanup:', error);
    }
  }

  // ✅ Scenario 1: Customer books → Customer gets "Booking Confirmed"
  static async notifyCustomerBookingConfirmed(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('🎉 ENHANCED: Notifying customer of booking confirmation');
    return this.sendToAllDevices(
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

  // ✅ Scenario 2: Customer books → Merchant gets "New Booking"
  static async notifyMerchantNewBooking(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('📅 ENHANCED: Notifying merchant of new booking');
    return this.sendToAllDevices(
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

  // ✅ Scenario 3: Customer cancels → Merchant gets "Booking Canceled"
  static async notifyMerchantBookingCanceled(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('❌ ENHANCED: Notifying merchant of booking cancellation');
    return this.sendToAllDevices(
      merchantUserId,
      '❌ Booking Canceled',
      `${customerName} has canceled their ${serviceName} appointment for ${dateTime}`,
      {
        type: 'booking_canceled_by_customer',
        bookingId,
        customerName,
        serviceName,
        dateTime
      }
    );
  }

  // ✅ Scenario 4: Merchant cancels → Customer gets "Booking Canceled"
  static async notifyCustomerBookingCanceled(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string,
    reason?: string
  ): Promise<boolean> {
    console.log('❌ ENHANCED: Notifying customer of booking cancellation by merchant');
    const baseMessage = `Your ${serviceName} appointment at ${shopName} for ${dateTime} has been canceled.`;
    const fullMessage = reason ? `${baseMessage} Reason: ${reason}` : baseMessage;
    
    return this.sendToAllDevices(
      customerId,
      '❌ Booking Canceled',
      fullMessage,
      {
        type: 'booking_canceled_by_merchant',
        bookingId,
        shopName,
        serviceName,
        dateTime,
        reason
      }
    );
  }

  // ✅ Scenario 5: Merchant completes → Customer gets "Review Request"
  static async notifyCustomerServiceCompleted(
    customerId: string,
    shopName: string,
    bookingId: string
  ): Promise<boolean> {
    console.log('⭐ ENHANCED: Notifying customer of service completion for review');
    return this.sendToAllDevices(
      customerId,
      '⭐ How was your visit?',
      `Hope you enjoyed your service at ${shopName}! Tap to leave a review.`,
      {
        type: 'service_completed',
        bookingId,
        shopName,
        action: 'review'
      }
    );
  }
}
