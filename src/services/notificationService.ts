
import { supabase } from '@/integrations/supabase/client';

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
