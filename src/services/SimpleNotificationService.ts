
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced Simple notification service with multi-device support and proper error handling
 */
export class SimpleNotificationService {
  /**
   * Send notification to all user's devices with enhanced error handling
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    console.log('📤 SIMPLE: Sending multi-device notification to user:', userId);
    
    try {
      // Get all active device tokens for the user
      const { data: tokens, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('❌ SIMPLE: Error fetching device tokens:', error);
        return false;
      }

      if (!tokens || tokens.length === 0) {
        console.log('⚠️ SIMPLE: No device tokens found for user:', userId);
        return false;
      }

      console.log(`📱 SIMPLE: Found ${tokens.length} devices for user:`, userId);

      let successCount = 0;
      const invalidTokens: string[] = [];

      // Send to all devices concurrently for better performance
      const sendPromises = tokens.map(async (device) => {
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
            console.log(`✅ SIMPLE: Sent to ${device.device_type}: ${device.device_name}`);
            return { success: true, device };
          } else {
            console.error(`❌ SIMPLE: Failed to send to ${device.device_type}:`, sendError || response?.error);
            
            // Check for invalid token errors
            const errorMessage = sendError?.message || response?.error || '';
            if (errorMessage.includes('UNREGISTERED') || 
                errorMessage.includes('invalid') ||
                errorMessage.includes('not found')) {
              invalidTokens.push(device.fcm_token);
            }
            return { success: false, device, error: errorMessage };
          }
        } catch (deviceError: any) {
          console.error(`❌ SIMPLE: Exception sending to ${device.device_type}:`, deviceError);
          
          const errorMessage = deviceError?.message || 'Unknown error';
          if (errorMessage.includes('UNREGISTERED') || 
              errorMessage.includes('invalid') ||
              errorMessage.includes('not found')) {
            invalidTokens.push(device.fcm_token);
          }
          return { success: false, device, error: errorMessage };
        }
      });

      // Wait for all send attempts to complete
      await Promise.all(sendPromises);

      // Clean up invalid tokens
      if (invalidTokens.length > 0) {
        console.log(`🧹 SIMPLE: Cleaning up ${invalidTokens.length} invalid tokens`);
        await this.cleanupInvalidTokens(invalidTokens);
      }

      // Update last_used_at for successful tokens
      const successfulTokens = tokens
        .filter(token => !invalidTokens.includes(token.fcm_token))
        .map(token => token.fcm_token);

      if (successfulTokens.length > 0) {
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .in('fcm_token', successfulTokens);
      }

      console.log(`📊 SIMPLE: Multi-device notification sent to ${successCount}/${tokens.length} devices`);
      return successCount > 0;
      
    } catch (error) {
      console.error('❌ SIMPLE: Error in sendNotification:', error);
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
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('fcm_token', tokens);
      
      if (error) {
        console.error('❌ SIMPLE: Error cleaning up invalid tokens:', error);
      } else {
        console.log('✅ SIMPLE: Invalid tokens cleaned up successfully');
      }
    } catch (error) {
      console.error('❌ SIMPLE: Error in token cleanup:', error);
    }
  }

  // Enhanced booking notification methods with proper data fetching
  static async notifyMerchantOfNewBooking(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
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

  static async notifyCustomerBookingConfirmed(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
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

  static async notifyCustomerBookingCompleted(
    customerId: string,
    shopName: string,
    bookingId: string
  ): Promise<boolean> {
    return this.sendNotification(
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

  static async notifyBookingCancelled(
    userId: string,
    message: string,
    bookingId: string,
    additionalData: Record<string, any> = {}
  ): Promise<boolean> {
    return this.sendNotification(
      userId,
      '❌ Booking Cancelled',
      message,
      {
        type: 'booking_cancelled',
        bookingId,
        ...additionalData
      }
    );
  }

  static async sendTestNotification(userId: string): Promise<boolean> {
    return this.sendNotification(
      userId,
      '🔔 Test Notification',
      'This is a test notification from BooqIt with enhanced multi-device support!',
      {
        type: 'test',
        timestamp: Date.now(),
        multiDevice: true
      }
    );
  }
}
