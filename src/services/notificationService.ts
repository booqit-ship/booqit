
import { supabase } from '@/integrations/supabase/client';
import { getFCMToken } from '@/firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const saveUserFCMToken = async (userId: string, token: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('💾 Saving FCM token for user:', userId);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        fcm_token: token,
        notification_enabled: true,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error saving FCM token:', error);
      return false;
    }

    console.log('✅ FCM token saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in saveUserFCMToken:', error);
    return false;
  }
};

export const sendNotificationToUser = async (userId: string, payload: NotificationPayload) => {
  try {
    console.log('📤 Sending notification to user:', userId, payload);

    // Get user's FCM token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.fcm_token) {
      console.log('❌ No FCM token found for user:', userId);
      return false;
    }

    // Call Supabase Edge Function to send notification
    const { data, error: sendError } = await supabase.functions.invoke('send-notification', {
      body: {
        token: profile.fcm_token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {}
      }
    });

    if (sendError) {
      console.error('❌ Error sending notification:', sendError);
      return false;
    }

    console.log('✅ Notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error in sendNotificationToUser:', error);
    return false;
  }
};

export const initializeUserNotifications = async (userId: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🚀 Initializing notifications for user:', userId, userRole);

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      console.log('❌ Could not get FCM token');
      return false;
    }

    // Save token to user profile
    const saved = await saveUserFCMToken(userId, token, userRole);
    if (!saved) {
      console.log('❌ Could not save FCM token');
      return false;
    }

    // Send welcome notification
    const welcomeMessage = userRole === 'merchant' 
      ? 'Welcome back to BooqIt! Ready to manage your bookings?' 
      : 'Welcome back to BooqIt! Your beauty appointments await!';

    await sendNotificationToUser(userId, {
      title: 'Welcome to BooqIt! 🎉',
      body: welcomeMessage,
      data: {
        type: 'welcome',
        userId: userId
      }
    });

    console.log('✅ User notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
    return false;
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
