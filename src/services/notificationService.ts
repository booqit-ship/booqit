
import { supabase } from '@/integrations/supabase/client';
import { getFCMToken } from '@/firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const saveUserFCMToken = async (userId: string, token: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('💾 Saving FCM token for user:', userId, 'Role:', userRole);
    console.log('🔑 Token length:', token.length, 'Token preview:', token.substring(0, 30) + '...');
    
    const { error } = await supabase
      .from('profiles')
      .update({
        fcm_token: token,
        notification_enabled: true,
        last_notification_sent: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error saving FCM token:', error);
      throw new Error(`Failed to save FCM token: ${error.message}`);
    }

    console.log('✅ FCM token saved successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error in saveUserFCMToken:', error);
    throw error;
  }
};

export const sendNotificationToUser = async (userId: string, payload: NotificationPayload) => {
  try {
    console.log('📤 Sending notification to user:', userId);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data
      }
    });

    console.log('📨 Edge Function Response:', { data, error });

    if (error) {
      console.error('❌ Error calling Edge Function:', error);
      
      // Provide more specific error messages
      if (error.message.includes('No FCM token')) {
        throw new Error('Please enable notifications first. Go to Settings → Notifications to enable.');
      } else if (error.message.includes('not found')) {
        throw new Error('User profile not found. Please try logging out and back in.');
      } else if (error.message.includes('disabled')) {
        throw new Error('Notifications are disabled for this user.');
      } else {
        throw new Error(`Notification failed: ${error.message}`);
      }
    }

    // Check for successful response
    if (data && !data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    console.log('✅ Notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error in sendNotificationToUser:', error);
    throw error;
  }
};

export const initializeUserNotifications = async (userId: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🚀 Initializing notifications for user:', userId, userRole);

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('❌ This browser does not support notifications');
      return { success: false, reason: 'not_supported' };
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    console.log('📱 Current permission status:', currentPermission);
    
    if (currentPermission === 'denied') {
      console.log('❌ Notification permission is denied');
      return { success: false, reason: 'permission_denied' };
    }

    if (currentPermission !== 'granted') {
      console.log('❌ Notification permission not granted');
      return { success: false, reason: 'permission_not_granted' };
    }

    // Get FCM token with retry logic
    console.log('🔑 Getting FCM token...');
    let token;
    let tokenRetries = 3;
    
    while (tokenRetries > 0) {
      try {
        token = await getFCMToken();
        if (token) break;
        
        tokenRetries--;
        if (tokenRetries > 0) {
          console.log(`🔄 Retrying FCM token generation... (${3 - tokenRetries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('❌ Error getting FCM token:', error);
        tokenRetries--;
        if (tokenRetries === 0) {
          return { success: false, reason: 'token_failed', error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!token) {
      console.log('❌ Could not get FCM token after retries');
      return { success: false, reason: 'token_failed' };
    }

    console.log('🔑 FCM Token obtained:', token.substring(0, 20) + '...');

    // Save token to user profile with retry logic
    console.log('💾 Saving FCM token to profile...');
    try {
      await saveUserFCMToken(userId, token, userRole);
    } catch (error) {
      console.log('❌ Could not save FCM token:', error.message);
      return { success: false, reason: 'save_failed', error: error.message };
    }

    console.log('✅ User notifications initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return { success: false, reason: 'initialization_error', error: error.message };
  }
};

// Notification triggers for different events
export const sendBookingNotification = async (merchantId: string, bookingDetails: {
  customerName: string;
  serviceName: string;
  dateTime: string;
}) => {
  await sendNotificationToUser(merchantId, {
    title: 'New Booking! 📅',
    body: `${bookingDetails.customerName} has booked ${bookingDetails.serviceName} for ${bookingDetails.dateTime}`,
    data: {
      type: 'new_booking',
      merchantId: merchantId
    }
  });
};

export const sendCompletionNotification = async (customerId: string, merchantName: string) => {
  await sendNotificationToUser(customerId, {
    title: 'How was your visit? ⭐',
    body: `Hope you enjoyed your service at ${merchantName}! Tap to leave a review.`,
    data: {
      type: 'review_request',
      customerId: customerId
    }
  });
};

export const sendWeeklyReminderNotification = async (customerId: string) => {
  await sendNotificationToUser(customerId, {
    title: 'Your salon awaits! 💇‍♀️✨',
    body: 'Book your next appointment and look fabulous!',
    data: {
      type: 'weekly_reminder',
      customerId: customerId
    }
  });
};
