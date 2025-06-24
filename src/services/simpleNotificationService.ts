
import { SimpleNotificationService } from './SimpleNotificationService';

/**
 * Legacy notification service - now uses SimpleNotificationService
 * @deprecated Use SimpleNotificationService directly for new code
 */

export const sendSimpleNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  console.log('⚠️ LEGACY: sendSimpleNotification called, redirecting to SimpleNotificationService');
  
  return SimpleNotificationService.sendNotification(userId, title, body, data);
};

export const sendNewBookingNotification = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  console.log('📅 BOOKING NOTIF: Sending new booking notification to merchant:', merchantUserId);
  
  return SimpleNotificationService.notifyMerchantOfNewBooking(
    merchantUserId,
    customerName,
    serviceName,
    timeSlot,
    bookingId
  );
};
