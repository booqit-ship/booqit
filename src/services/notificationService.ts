import { supabase } from '@/integrations/supabase/client';
import { getFCMToken } from '@/firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const saveUserFCMToken = async (userId: string, token: string, userRole: 'customer' | 'merchant') => {
  try {
    if (!token) {
      console.error('❌ FCM TOKEN SAVE: No token provided');
      throw new Error('No FCM token to save');
    }

    console.log('💾 FCM TOKEN SAVE: Starting save process', {
      userId: userId,
      tokenPreview: token.substring(0, 20) + '...',
      userRole: userRole,
      tokenLength: token.length
    });

    // First, check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, fcm_token')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('📝 FCM TOKEN SAVE: Creating new profile for user:', userId);
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userRole === 'merchant' ? 'Merchant' : 'Customer',
          email: '',
          role: userRole,
          fcm_token: token,
          notification_enabled: true,
          last_notification_sent: new Date().toISOString()
        });

      if (createError) {
        console.error('❌ FCM TOKEN SAVE: Failed to create profile:', createError);
        throw new Error(`Failed to create profile: ${createError.message}`);
      }
      
      console.log('✅ FCM TOKEN SAVE: Profile created successfully for user:', userId);
    } else if (profileError) {
      console.error('❌ FCM TOKEN SAVE: Error checking profile:', profileError);
      throw new Error(`Profile check failed: ${profileError.message}`);
    } else {
      // Profile exists, update FCM token
      console.log('📝 FCM TOKEN SAVE: Updating existing profile for user:', userId);
      console.log('📝 FCM TOKEN SAVE: Old token:', existingProfile.fcm_token ? existingProfile.fcm_token.substring(0, 20) + '...' : 'none');
      console.log('📝 FCM TOKEN SAVE: New token:', token.substring(0, 20) + '...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          fcm_token: token,
          notification_enabled: true,
          last_notification_sent: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ FCM TOKEN SAVE: Error updating profile:', updateError);
        throw new Error(`Failed to update FCM token: ${updateError.message}`);
      }
    }

    console.log('✅ FCM TOKEN SAVE: Successfully saved FCM token for user:', userId);
    
    // Verify the save
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .single();
    
    if (verifyError) {
      console.error('❌ FCM TOKEN SAVE: Error verifying save:', verifyError);
    } else {
      console.log('✅ FCM TOKEN SAVE: Verification successful', {
        hasToken: !!verifyProfile.fcm_token,
        tokenMatch: verifyProfile.fcm_token === token,
        notificationEnabled: verifyProfile.notification_enabled
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ FCM TOKEN SAVE: Critical error in saveUserFCMToken:', error);
    throw error;
  }
};

export const initializeUserNotifications = async (userId: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🚀 INIT NOTIFICATIONS: Starting initialization', { userId, userRole });

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('❌ INIT NOTIFICATIONS: Browser does not support notifications');
      return { success: false, reason: 'not_supported' };
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    console.log('📱 INIT NOTIFICATIONS: Current permission status:', currentPermission);
    
    if (currentPermission === 'denied') {
      console.log('❌ INIT NOTIFICATIONS: Permission is denied');
      return { success: false, reason: 'permission_denied' };
    }

    if (currentPermission !== 'granted') {
      console.log('❌ INIT NOTIFICATIONS: Permission not granted');
      return { success: false, reason: 'permission_not_granted' };
    }

    // Get FCM token with enhanced logging
    console.log('🔑 INIT NOTIFICATIONS: Getting FCM token...');
    let token;
    let tokenRetries = 3;
    
    while (tokenRetries > 0) {
      try {
        console.log(`🔑 INIT NOTIFICATIONS: Attempting to get FCM token (attempt ${4 - tokenRetries}/3)...`);
        token = await getFCMToken();
        
        if (token) {
          console.log('🔑 INIT NOTIFICATIONS: FCM token obtained successfully:', {
            tokenPreview: token.substring(0, 30) + '...',
            tokenLength: token.length
          });
          break;
        }
        
        tokenRetries--;
        if (tokenRetries > 0) {
          console.log(`🔄 INIT NOTIFICATIONS: No token received, retrying... (${3 - tokenRetries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error('❌ INIT NOTIFICATIONS: Error getting FCM token:', error);
        tokenRetries--;
        if (tokenRetries === 0) {
          return { success: false, reason: 'token_failed', error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!token) {
      console.log('❌ INIT NOTIFICATIONS: Could not get FCM token after retries');
      return { success: false, reason: 'token_failed' };
    }

    // Save token to user profile
    console.log('💾 INIT NOTIFICATIONS: Saving FCM token to profile...');
    try {
      await saveUserFCMToken(userId, token, userRole);
    } catch (error: any) {
      console.error('❌ INIT NOTIFICATIONS: Could not save FCM token:', error);
      return { success: false, reason: 'save_failed', error: error.message };
    }

    console.log('✅ INIT NOTIFICATIONS: User notifications initialized successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ INIT NOTIFICATIONS: Critical error during initialization:', error);
    return { success: false, reason: 'initialization_error', error: error.message };
  }
};

// Enhanced notification checking function
const canSendNotification = async (userId: string) => {
  try {
    console.log('🔍 NOTIFICATION CHECK: Checking if user can receive notifications:', userId);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled, name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ NOTIFICATION CHECK: Error fetching profile:', error);
      return false;
    }

    if (!profile) {
      console.log('⚠️ NOTIFICATION CHECK: No profile found for user - they need to enable notifications first');
      return false;
    }

    console.log('👤 NOTIFICATION CHECK: Profile found:', {
      userId: userId,
      name: profile.name,
      role: profile.role,
      hasToken: !!profile.fcm_token,
      tokenPreview: profile.fcm_token ? profile.fcm_token.substring(0, 20) + '...' : 'none',
      notificationEnabled: profile.notification_enabled
    });

    if (profile.notification_enabled === false) {
      console.log('🚫 NOTIFICATION CHECK: Notifications disabled for user');
      return false;
    }

    if (!profile.fcm_token) {
      console.log('🚫 NOTIFICATION CHECK: No FCM token found - user needs to enable notifications');
      return false;
    }

    console.log('✅ NOTIFICATION CHECK: User can receive notifications');
    return true;
  } catch (error) {
    console.error('❌ NOTIFICATION CHECK: Error checking notification permissions:', error);
    return false;
  }
};

export const sendNotificationToUser = async (userId: string, payload: NotificationPayload) => {
  try {
    console.log('📤 SEND NOTIFICATION: Starting send to user:', { userId, payload });

    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data
      }
    });

    console.log('📨 SEND NOTIFICATION: Edge Function Response:', { data, error });

    if (error) {
      console.error('❌ SEND NOTIFICATION: Error calling Edge Function:', error);
      
      if (error.message.includes('No profile found')) {
        throw new Error('User needs to enable notifications in the app first. The merchant should open the app and allow notifications.');
      } else if (error.message.includes('No FCM token')) {
        throw new Error('User needs to enable push notifications in their browser.');
      } else if (error.message.includes('disabled')) {
        throw new Error('Notifications are disabled for this user.');
      } else if (error.message.includes('Profile lookup failed')) {
        throw new Error('User profile not found. The merchant should open the app to set up notifications.');
      } else {
        throw new Error(`Notification failed: ${error.message}`);
      }
    }

    if (data && !data.success) {
      console.error('❌ SEND NOTIFICATION: Backend error:', data.error);
      throw new Error(data.error || 'Unknown error occurred');
    }

    console.log('✅ SEND NOTIFICATION: Successfully sent:', data);
    return true;
  } catch (error) {
    console.error('❌ SEND NOTIFICATION: Error in sendNotificationToUser:', error);
    throw error;
  }
};

// Auto-initialize notifications for users who don't have FCM tokens
export const autoInitializeNotifications = async (userId: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🔄 AUTO INIT: Checking if user needs FCM setup:', { userId, userRole });
    
    // Check if user already has FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.fcm_token) {
      console.log('🚀 AUTO INIT: User needs FCM setup, attempting auto-initialization...');
      
      // Request permission first
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('❌ AUTO INIT: Permission denied by user');
          return { success: false, reason: 'permission_denied' };
        }
      }
      
      // Initialize notifications
      const result = await initializeUserNotifications(userId, userRole);
      console.log('🔄 AUTO INIT: Initialization result:', result);
      return result;
    } else {
      console.log('✅ AUTO INIT: User already has FCM token');
      return { success: true, reason: 'already_initialized' };
    }
  } catch (error) {
    console.error('❌ AUTO INIT: Error in auto-initialization:', error);
    return { success: false, reason: 'auto_init_error', error: error.message };
  }
};

// Notification triggers for different events
export const sendBookingNotification = async (merchantId: string, bookingDetails: {
  customerName: string;
  serviceName: string;
  dateTime: string;
}) => {
  console.log('📅 BOOKING TRIGGER: Sending booking notification to merchant:', { merchantId, bookingDetails });
  
  try {
    await sendNotificationToUser(merchantId, {
      title: 'New Booking! 📅',
      body: `${bookingDetails.customerName} has booked ${bookingDetails.serviceName} for ${bookingDetails.dateTime}`,
      data: {
        type: 'new_booking',
        merchantId: merchantId
      }
    });
  } catch (error) {
    console.error('❌ BOOKING TRIGGER: Failed to send notification:', error);
    
    // If notification fails due to missing FCM token, try to auto-initialize
    if (error.message.includes('profile') || error.message.includes('FCM token')) {
      console.log('🔄 BOOKING TRIGGER: Attempting auto-initialization for merchant...');
      const autoInitResult = await autoInitializeNotifications(merchantId, 'merchant');
      
      if (autoInitResult.success) {
        console.log('🔄 BOOKING TRIGGER: Auto-initialization successful, retrying notification...');
        try {
          await sendNotificationToUser(merchantId, {
            title: 'New Booking! 📅',
            body: `${bookingDetails.customerName} has booked ${bookingDetails.serviceName} for ${bookingDetails.dateTime}`,
            data: {
              type: 'new_booking',
              merchantId: merchantId
            }
          });
          console.log('✅ BOOKING TRIGGER: Notification sent after auto-initialization');
        } catch (retryError) {
          console.error('❌ BOOKING TRIGGER: Failed to send notification even after auto-initialization:', retryError);
        }
      } else {
        console.log('❌ BOOKING TRIGGER: Auto-initialization failed:', autoInitResult);
      }
    }
  }
};

export const sendCompletionNotification = async (customerId: string, merchantName: string) => {
  console.log('⭐ COMPLETION TRIGGER: Sending completion notification to customer:', { customerId, merchantName });
  
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
  console.log('📅 WEEKLY REMINDER: Sending weekly reminder to customer:', { customerId });
  
  await sendNotificationToUser(customerId, {
    title: 'Your salon awaits! 💇‍♀️✨',
    body: 'Book your next appointment and look fabulous!',
    data: {
      type: 'weekly_reminder',
      customerId: customerId
    }
  });
};

/**
 * NEW: Fetch user notification preferences
 */
export const getUserNotificationPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
};

export const updateUserNotificationPreference = async (
  userId: string, notificationType: string, enabled: boolean
) => {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .upsert([{ user_id: userId, notification_type: notificationType, enabled }], { onConflict: "user_id,notification_type" })
    .select();

  if (error) throw new Error(error.message);
  return data;
};

export const getNotificationLogs = async (userId: string, limit = 25) => {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("user_id", userId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
};

export const runScheduledNotifications = async (adminSecret: string) => {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-scheduled-notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": adminSecret
    }
  });
  if (!res.ok) throw new Error(await res.text());
  const response = await res.json();
  return response;
};
