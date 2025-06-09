
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
      return false;
    }

    console.log('✅ FCM token saved successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error in saveUserFCMToken:', error);
    return false;
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
      throw new Error(`Edge Function error: ${error.message}`);
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

    // Enhanced Service Worker check with longer timeout
    console.log('🔍 Checking Service Worker status...');
    if ('serviceWorker' in navigator) {
      try {
        // Wait for service worker to be ready with extended timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker timeout')), 15000)
        );
        
        const readyPromise = navigator.serviceWorker.ready;
        await Promise.race([readyPromise, timeoutPromise]);
        
        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          console.error('❌ Firebase messaging Service Worker not found');
          return { success: false, reason: 'service_worker_not_found' };
        }
        
        if (!registration.active) {
          console.error('❌ Service Worker is not active');
          return { success: false, reason: 'service_worker_not_active' };
        }
        
        console.log('✅ Service Worker is ready and active');
      } catch (swError) {
        console.error('❌ Error checking Service Worker:', swError);
        return { success: false, reason: 'service_worker_error', error: swError.message };
      }
    }

    // Get FCM token with improved error handling
    console.log('🔑 Getting FCM token...');
    const token = await getFCMToken();
    if (!token) {
      console.log('❌ Could not get FCM token');
      return { success: false, reason: 'token_failed' };
    }

    console.log('🔑 FCM Token obtained:', token.substring(0, 20) + '...');

    // Save token to user profile
    console.log('💾 Saving FCM token to profile...');
    const saved = await saveUserFCMToken(userId, token, userRole);
    if (!saved) {
      console.log('❌ Could not save FCM token');
      return { success: false, reason: 'save_failed' };
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
  try {
    console.log('📤 Sending booking notification to merchant:', merchantId);
    await sendNotificationToUser(merchantId, {
      title: 'New Booking! 📅',
      body: `${bookingDetails.customerName} has booked ${bookingDetails.serviceName} for ${bookingDetails.dateTime}`,
      data: {
        type: 'new_booking',
        merchantId: merchantId
      }
    });
    console.log('✅ Booking notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking notification:', error);
  }
};

export const sendCompletionNotification = async (customerId: string, merchantName: string) => {
  try {
    console.log('📤 Sending completion notification to customer:', customerId);
    await sendNotificationToUser(customerId, {
      title: 'How was your visit? ⭐',
      body: `Hope you enjoyed your service at ${merchantName}! Tap to leave a review.`,
      data: {
        type: 'review_request',
        customerId: customerId
      }
    });
    console.log('✅ Completion notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending completion notification:', error);
  }
};

export const sendWeeklyReminderNotification = async (customerId: string) => {
  try {
    console.log('📤 Sending weekly reminder to customer:', customerId);
    await sendNotificationToUser(customerId, {
      title: 'Your salon awaits! 💇‍♀️✨',
      body: 'Book your next appointment and look fabulous!',
      data: {
        type: 'weekly_reminder',
        customerId: customerId
      }
    });
    console.log('✅ Weekly reminder sent successfully');
  } catch (error) {
    console.error('❌ Error sending weekly reminder:', error);
  }
};
