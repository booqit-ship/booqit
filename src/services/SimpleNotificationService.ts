
import { supabase } from '@/integrations/supabase/client';
import { EnhancedNotificationService } from './EnhancedNotificationService';

/**
 * Simple notification service - now using enhanced cross-user capabilities
 */
export class SimpleNotificationService {
  /**
   * Send notification to all user's devices (legacy method - now uses enhanced service)
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    console.log('📤 SIMPLE: Redirecting to enhanced notification service');
    
    // Use enhanced service for better cross-user support
    try {
      // Use direct query instead of RPC to avoid TypeScript issues
      const { data: tokens, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error || !tokens || tokens.length === 0) {
        console.log('⚠️ SIMPLE: No device tokens found for user:', userId);
        return false;
      }

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
            console.log('✅ SIMPLE: Sent to device:', device.device_type, device.device_name);
          } else {
            console.error('❌ SIMPLE: Failed to send to device:', device.device_type, sendError || response?.error);
            
            if (sendError?.message?.includes('UNREGISTERED') || 
                sendError?.message?.includes('invalid') ||
                response?.error?.includes('UNREGISTERED') ||
                response?.error?.includes('invalid')) {
              invalidTokens.push(device.fcm_token);
            }
          }
        } catch (deviceError: any) {
          console.error('❌ SIMPLE: Error sending to device:', device.device_type, deviceError);
          
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

      console.log(`📊 SIMPLE: Notification sent to ${successCount}/${tokens.length} devices`);
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

  // ✅ Updated methods to use EnhancedNotificationService
  static async notifyMerchantOfNewBooking(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    return EnhancedNotificationService.notifyMerchantNewBooking(
      merchantUserId, customerName, serviceName, dateTime, bookingId
    );
  }

  static async notifyCustomerBookingConfirmed(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    return EnhancedNotificationService.notifyCustomerBookingConfirmed(
      customerId, shopName, serviceName, dateTime, bookingId
    );
  }

  static async notifyCustomerBookingCompleted(
    customerId: string,
    shopName: string,
    bookingId: string
  ): Promise<boolean> {
    return EnhancedNotificationService.notifyCustomerServiceCompleted(
      customerId, shopName, bookingId
    );
  }

  static async notifyBookingCancelled(
    userId: string,
    message: string,
    bookingId: string
  ): Promise<boolean> {
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
