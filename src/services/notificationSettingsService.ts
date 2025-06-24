
import { supabase } from '@/integrations/supabase/client';
import { SimpleNotificationService } from './SimpleNotificationService';

/**
 * Legacy notification settings service
 * @deprecated Use SimpleNotificationService directly
 */

export const updateNotificationSettings = async (
  userId: string,
  enabled: boolean
) => {
  console.log('⚠️ LEGACY: updateNotificationSettings called');
  
  try {
    // Update in profiles table for backwards compatibility
    const { error } = await supabase
      .from('profiles')
      .update({ notification_enabled: enabled })
      .eq('id', userId);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return { success: false, error };
  }
};

export const getNotificationSettings = async (userId: string) => {
  console.log('⚠️ LEGACY: getNotificationSettings called');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_enabled')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    return { 
      success: true, 
      settings: { 
        enabled: data?.notification_enabled ?? true 
      } 
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return { success: false, error };
  }
};
