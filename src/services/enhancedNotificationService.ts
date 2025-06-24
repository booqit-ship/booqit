
import { supabase } from '@/integrations/supabase/client';
import { MultiDeviceNotificationService } from './multiDeviceNotificationService';

export class EnhancedNotificationService {
  /**
   * Send notification to all user's devices
   */
  static async sendToAllUserDevices(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    }
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      console.log('📤 ENHANCED: Sending notification to all devices for user:', userId);

      // Get all active device tokens for the user
      const { data: deviceTokens, error } = await supabase.rpc('get_user_device_tokens', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ ENHANCED: Error fetching device tokens:', error);
        return { success: false, results: [] };
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log('⚠️ ENHANCED: No device tokens found for user:', userId);
        return { success: false, results: [] };
      }

      console.log(`📱 ENHANCED: Found ${deviceTokens.length} devices for user:`, userId);

      // Send notification to each device token
      const results = [];
      for (const device of deviceTokens) {
        try {
          const { data, error } = await supabase.functions.invoke('send-notification', {
            body: {
              userId,
              title: notification.title,
              body: notification.body,
              data: {
                ...notification.data,
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
            console.error('❌ ENHANCED: Failed to send to device:', device.device_type, error || data?.error);
          } else {
            console.log('✅ ENHANCED: Sent to device:', device.device_type, device.device_name);
          }
        } catch (deviceError) {
          console.error('❌ ENHANCED: Error sending to device:', device.device_type, deviceError);
          results.push({
            device_type: device.device_type,
            device_name: device.device_name,
            success: false,
            error: deviceError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📊 ENHANCED: Notification sent to ${successCount}/${results.length} devices`);

      return {
        success: successCount > 0,
        results
      };
    } catch (error) {
      console.error('❌ ENHANCED: Error in sendToAllUserDevices:', error);
      return { success: false, results: [] };
    }
  }

  /**
   * Send booking notification to merchant (all their devices)
   */
  static async sendBookingNotificationToMerchant(
    merchantUserId: string,
    customerName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    const result = await this.sendToAllUserDevices(merchantUserId, {
      title: '📅 New Booking!',
      body: `${customerName} booked ${serviceName} for ${dateTime}`,
      data: {
        type: 'new_booking',
        bookingId,
        customerName,
        serviceName,
        dateTime
      }
    });

    return result.success;
  }

  /**
   * Send booking confirmation to customer (all their devices)
   */
  static async sendBookingConfirmationToCustomer(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    const result = await this.sendToAllUserDevices(customerId, {
      title: '🎉 Booking Confirmed!',
      body: `Your appointment at ${shopName} for ${serviceName} on ${dateTime} is confirmed!`,
      data: {
        type: 'booking_confirmed',
        bookingId,
        shopName,
        serviceName,
        dateTime
      }
    });

    return result.success;
  }

  /**
   * Send reminder notification to customer (all their devices)
   */
  static async sendBookingReminderToCustomer(
    customerId: string,
    shopName: string,
    serviceName: string,
    dateTime: string,
    bookingId: string
  ): Promise<boolean> {
    const result = await this.sendToAllUserDevices(customerId, {
      title: '⏰ Appointment Reminder',
      body: `Your appointment at ${shopName} for ${serviceName} is tomorrow at ${dateTime}`,
      data: {
        type: 'booking_reminder',
        bookingId,
        shopName,
        serviceName,
        dateTime
      }
    });

    return result.success;
  }
}
