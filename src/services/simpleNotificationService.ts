
import { supabase } from '@/integrations/supabase/client';

export interface SimpleNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Simple function to send notification - just check FCM token and send
export const sendSimpleNotification = async (userId: string, payload: SimpleNotificationPayload) => {
  try {
    console.log('📤 SIMPLE SEND: Sending notification to user:', userId);

    // Simply get the FCM token from profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.log('🚫 SIMPLE SEND: No profile found for user:', userId);
      return { success: false, reason: 'no_profile' };
    }

    if (!profile.fcm_token) {
      console.log('🚫 SIMPLE SEND: No FCM token found for user:', userId);
      return { success: false, reason: 'no_fcm_token' };
    }

    if (profile.notification_enabled === false) {
      console.log('🚫 SIMPLE SEND: Notifications disabled for user:', userId);
      return { success: false, reason: 'notifications_disabled' };
    }

    console.log('✅ SIMPLE SEND: User has FCM token, sending notification...');

    // Send notification via edge function
    const { data, error: sendError } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data
      }
    });

    if (sendError) {
      console.error('❌ SIMPLE SEND: Edge function error:', sendError);
      return { success: false, reason: 'send_failed', error: sendError.message };
    }

    console.log('✅ SIMPLE SEND: Notification sent successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ SIMPLE SEND: Error:', error);
    return { success: false, reason: 'error', error: error.message };
  }
};

// Simple booking notification for merchants
export const sendBookingNotificationToMerchant = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  console.log('🆕 SIMPLE BOOKING: Sending to merchant:', merchantUserId);
  
  const result = await sendSimpleNotification(merchantUserId, {
    title: "New booking received! 💇‍♀️",
    body: `${customerName} booked ${serviceName} at ${timeSlot}`,
    data: {
      type: 'new_booking',
      bookingId,
      merchantUserId,
      timestamp: new Date().toISOString()
    }
  });

  if (result.success) {
    console.log('✅ SIMPLE BOOKING: Notification sent to merchant');
  } else {
    console.log('🚫 SIMPLE BOOKING: Failed to send notification:', result.reason);
  }

  return result;
};

// Simple completion notification for customers
export const sendCompletionNotificationToCustomer = async (
  customerId: string,
  merchantName: string,
  bookingId: string
) => {
  console.log('⭐ SIMPLE COMPLETION: Sending to customer:', customerId);
  
  const result = await sendSimpleNotification(customerId, {
    title: "How was your visit? ⭐",
    body: `Hope you enjoyed your service at ${merchantName}! Tap to leave a review.`,
    data: {
      type: 'review_request',
      bookingId,
      customerId,
      timestamp: new Date().toISOString()
    }
  });

  return result;
};

// Save FCM token to user profile (simple update)
export const saveUserFCMTokenSimple = async (userId: string, token: string) => {
  try {
    console.log('💾 SIMPLE SAVE: Saving FCM token for user:', userId);

    const { error } = await supabase
      .from('profiles')
      .update({
        fcm_token: token,
        notification_enabled: true,
        last_notification_sent: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ SIMPLE SAVE: Error updating FCM token:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ SIMPLE SAVE: FCM token saved successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ SIMPLE SAVE: Error:', error);
    return { success: false, error: error.message };
  }
};
