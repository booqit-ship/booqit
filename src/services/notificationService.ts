
import { supabase } from '@/integrations/supabase/client';
import { SimpleNotificationService } from './SimpleNotificationService';

/**
 * Legacy notification service - redirects to SimpleNotificationService
 * @deprecated Use SimpleNotificationService directly
 */

export const sendNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  console.log('⚠️ LEGACY: sendNotification called, redirecting to SimpleNotificationService');
  
  return SimpleNotificationService.sendNotification(userId, title, body, data);
};

export const sendNotificationToUser = async (
  userId: string,
  notification: { title: string; body: string; data?: Record<string, any> }
) => {
  console.log('⚠️ LEGACY: sendNotificationToUser called, redirecting to SimpleNotificationService');
  
  return SimpleNotificationService.sendNotification(
    userId, 
    notification.title, 
    notification.body, 
    notification.data
  );
};

export const sendBookingConfirmation = async (
  customerId: string,
  shopName: string,
  serviceName: string,
  date: string,
  time: string,
  bookingId: string
) => {
  console.log('📅 LEGACY: sendBookingConfirmation called, redirecting to SimpleNotificationService');
  
  return SimpleNotificationService.notifyCustomerBookingConfirmed(
    customerId,
    shopName,
    serviceName,
    `${date} at ${time}`,
    bookingId
  );
};

export const sendNewBookingAlert = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  console.log('📅 LEGACY: sendNewBookingAlert called, redirecting to SimpleNotificationService');
  
  return SimpleNotificationService.notifyMerchantOfNewBooking(
    merchantUserId,
    customerName,
    serviceName,
    timeSlot,
    bookingId
  );
};

export const getNotificationLogs = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return [];
  }
};

export const getUserNotificationPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return [];
  }
};

export const updateUserNotificationPreference = async (
  userId: string,
  notificationType: string,
  enabled: boolean
) => {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        notification_type: notificationType,
        enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,notification_type'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating notification preference:', error);
    return { success: false, error };
  }
};
