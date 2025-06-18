
import { supabase } from '@/integrations/supabase/client';
import { setupNotifications } from '@/lib/capacitor-firebase';

export const getUserNotificationPreferences = async (userId: string) => {
  console.log('📋 NOTIF SERVICE: Getting preferences for user:', userId);
  
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ NOTIF SERVICE: Error fetching preferences:', error);
    throw error;
  }

  console.log('✅ NOTIF SERVICE: Fetched preferences:', data);
  return data || [];
};

export const updateUserNotificationPreference = async (
  userId: string,
  notificationType: string,
  enabled: boolean
) => {
  console.log('💾 UPDATE PREF: Updating preference:', { userId, notificationType, enabled });

  try {
    // First try to update existing preference
    const { data: existingData, error: selectError } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .maybeSingle();

    if (selectError) {
      console.error('❌ UPDATE PREF: Error checking existing preference:', selectError);
      throw selectError;
    }

    if (existingData) {
      // Update existing preference
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .select()
        .single();

      if (error) {
        console.error('❌ UPDATE PREF: Error updating preference:', error);
        throw error;
      }

      console.log('✅ UPDATE PREF: Updated preference:', data);
      return data;
    } else {
      // Insert new preference
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          enabled,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ UPDATE PREF: Error inserting preference:', error);
        throw error;
      }

      console.log('✅ UPDATE PREF: Inserted new preference:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ UPDATE PREF: Critical error:', error);
    throw error;
  }
};

// Get notification logs for a user
export const getNotificationLogs = async (userId: string) => {
  console.log('📋 NOTIF SERVICE: Getting notification logs for user:', userId);
  
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ NOTIF SERVICE: Error fetching logs:', error);
    throw error;
  }

  console.log('✅ NOTIF SERVICE: Fetched logs:', data?.length || 0);
  return data || [];
};

// Initialize user notifications with FCM token
export const initializeUserNotifications = async (userId: string, userRole: string) => {
  try {
    console.log('🔔 INIT NOTIFICATIONS: Starting for user:', userId, 'role:', userRole);

    // Get FCM token
    const fcmToken = await setupNotifications();
    
    if (!fcmToken) {
      console.log('❌ INIT NOTIFICATIONS: No FCM token received');
      return { success: false, reason: 'token_failed' };
    }

    console.log('🔑 INIT NOTIFICATIONS: Got FCM token, saving to profile...');

    // Update user profile with FCM token and enable notifications
    const { error } = await supabase
      .from('profiles')
      .update({
        fcm_token: fcmToken,
        notification_enabled: true
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ INIT NOTIFICATIONS: Error updating profile:', error);
      return { success: false, reason: 'profile_update_failed' };
    }

    console.log('✅ INIT NOTIFICATIONS: Successfully initialized for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ INIT NOTIFICATIONS: Error:', error);
    return { success: false, reason: 'unknown_error' };
  }
};

// Send notification to a specific user with detailed debugging
export const sendNotificationToUser = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) => {
  try {
    console.log('📤 SEND NOTIFICATION: Sending to user:', userId);
    console.log('📤 SEND NOTIFICATION: Notification data:', notification);

    // Debug: First check if user exists in profiles table
    const { data: debugProfile, error: debugError } = await supabase
      .from('profiles')
      .select('id, name, fcm_token, notification_enabled')
      .eq('id', userId);

    console.log('🔍 DEBUG: Profile query result:', debugProfile);
    if (debugError) {
      console.log('🔍 DEBUG: Profile query error:', debugError);
    }

    // Get user's FCM token and notification settings
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ SEND NOTIFICATION: Error fetching profile:', error);
      return false;
    }

    if (!profile) {
      console.log('❌ SEND NOTIFICATION: No profile found for user:', userId);
      return false;
    }

    console.log('✅ SEND NOTIFICATION: Found profile:', {
      hasFcmToken: !!profile.fcm_token,
      notificationEnabled: profile.notification_enabled
    });

    if (!profile.fcm_token) {
      console.log('❌ SEND NOTIFICATION: No FCM token for user:', userId);
      return false;
    }

    if (profile.notification_enabled === false) {
      console.log('🔕 SEND NOTIFICATION: Notifications disabled for user:', userId);
      return false;
    }

    console.log('✅ SEND NOTIFICATION: Sending notification...');

    // Send the notification via edge function
    const { error: notificationError } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title: notification.title,
        body: notification.body,
        data: notification.data
      }
    });

    if (notificationError) {
      console.error('❌ SEND NOTIFICATION: Failed to send:', notificationError);
      return false;
    }

    console.log('✅ SEND NOTIFICATION: Sent successfully');
    return true;
  } catch (error) {
    console.error('❌ SEND NOTIFICATION: Error:', error);
    return false;
  }
};
