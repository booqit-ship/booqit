
import { supabase } from '@/integrations/supabase/client';

export class RobustNotificationService {
  /**
   * Initialize user notification settings with proper authentication check
   */
  static async initializeUserSettings(userId: string, fcmToken: string): Promise<boolean> {
    try {
      // Verify user is authenticated before proceeding
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('❌ ROBUST: User not authenticated or ID mismatch');
        return false;
      }

      console.log('🔧 ROBUST: Initializing notification settings for user:', userId);
      
      // First try notification_settings table (primary)
      const { data: existingSettings } = await supabase
        .from('notification_settings')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('notification_settings')
          .update({
            fcm_token: fcmToken,
            notification_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('❌ ROBUST: Error updating notification_settings:', updateError);
          return await this.fallbackToProfiles(userId, fcmToken);
        }
        
        console.log('✅ ROBUST: Updated existing notification_settings');
        return true;
      } else {
        // Insert new settings
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: userId,
            fcm_token: fcmToken,
            notification_enabled: true,
            failed_notification_count: 0
          });

        if (insertError) {
          console.error('❌ ROBUST: Error inserting notification_settings:', insertError);
          return await this.fallbackToProfiles(userId, fcmToken);
        }
        
        console.log('✅ ROBUST: Created new notification_settings');
        return true;
      }
    } catch (error) {
      console.error('❌ ROBUST: Error in initializeUserSettings:', error);
      return await this.fallbackToProfiles(userId, fcmToken);
    }
  }

  /**
   * Update FCM token with authentication check
   */
  static async updateFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      // Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) {
        console.error('❌ ROBUST: User not authenticated for FCM token update');
        return false;
      }

      console.log('🔧 ROBUST: Updating FCM token for user:', userId);

      // Try notification_settings first
      const { error } = await supabase
        .from('notification_settings')
        .update({
          fcm_token: fcmToken,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ ROBUST: Error updating FCM token in notification_settings:', error);
        return await this.fallbackToProfiles(userId, fcmToken);
      }

      console.log('✅ ROBUST: FCM token updated in notification_settings');
      return true;
    } catch (error) {
      console.error('❌ ROBUST: Error in updateFCMToken:', error);
      return false;
    }
  }

  /**
   * Fallback to profiles table if notification_settings fails
   */
  private static async fallbackToProfiles(userId: string, fcmToken: string): Promise<boolean> {
    try {
      console.log('🔄 ROBUST: Falling back to profiles table for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          fcm_token: fcmToken,
          notification_enabled: true,
          last_notification_sent: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ ROBUST: Fallback to profiles also failed:', error);
        return false;
      }

      console.log('✅ ROBUST: Successfully used profiles table fallback');
      return true;
    } catch (error) {
      console.error('❌ ROBUST: Error in fallback to profiles:', error);
      return false;
    }
  }

  /**
   * Send notification with proper error handling
   */
  static async sendNotification(userId: string, notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    try {
      console.log('📤 ROBUST: Sending notification to user:', userId);

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: notification.title,
          body: notification.body,
          data: notification.data
        }
      });

      if (error) {
        console.error('❌ ROBUST: Error invoking notification function:', error);
        return false;
      }

      if (data?.success) {
        console.log('✅ ROBUST: Notification sent successfully');
        return true;
      } else {
        console.error('❌ ROBUST: Notification function returned failure:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ ROBUST: Error in sendNotification:', error);
      return false;
    }
  }
}

/**
 * Send booking confirmation notification to customer
 */
export const sendBookingConfirmation = async (
  customerId: string,
  shopName: string,
  serviceName: string,
  date: string,
  time: string,
  bookingId: string
): Promise<boolean> => {
  return RobustNotificationService.sendNotification(customerId, {
    title: '🎉 Booking Confirmed!',
    body: `Your appointment at ${shopName} for ${serviceName} on ${date} at ${time} is confirmed!`,
    data: {
      type: 'booking_confirmed',
      bookingId
    }
  });
};

/**
 * Send new booking alert to merchant
 */
export const sendNewBookingAlert = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
): Promise<boolean> => {
  return RobustNotificationService.sendNotification(merchantUserId, {
    title: '📅 New Booking!',
    body: `${customerName} booked ${serviceName} for ${timeSlot}`,
    data: {
      type: 'new_booking',
      bookingId
    }
  });
};
