
import { sendBookingConfirmation, sendNewBookingAlert } from './robustNotificationService';

/**
 * Legacy notification service - now uses robust notification system
 * @deprecated Use robustNotificationService directly for new code
 */

export const sendSimpleNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  console.log('⚠️ LEGACY: sendSimpleNotification called, redirecting to robust service');
  
  const { RobustNotificationService } = await import('./robustNotificationService');
  
  return RobustNotificationService.sendNotification(userId, {
    title,
    body,
    data
  });
};

export const sendNewBookingNotification = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  console.log('📅 BOOKING NOTIF: Sending new booking notification to merchant:', merchantUserId);
  
  return sendNewBookingAlert(
    merchantUserId,
    customerName,
    serviceName,
    timeSlot,
    bookingId
  );
};
