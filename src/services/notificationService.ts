
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
