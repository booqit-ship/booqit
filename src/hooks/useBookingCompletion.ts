
import { useCallback } from 'react';
import { sendBookingCompletedNotification } from '@/services/eventNotificationService';

export const useBookingCompletion = () => {
  const onBookingCompleted = useCallback(async (
    customerId: string, 
    merchantName: string, 
    bookingId: string
  ) => {
    console.log('🎯 BOOKING COMPLETION: Triggering completion notification');
    console.log('🎯 BOOKING COMPLETION: Customer ID:', customerId);
    console.log('🎯 BOOKING COMPLETION: Merchant Name:', merchantName);
    console.log('🎯 BOOKING COMPLETION: Booking ID:', bookingId);

    if (!customerId) {
      console.error('❌ BOOKING COMPLETION: Missing customer ID');
      return;
    }

    if (!merchantName) {
      console.error('❌ BOOKING COMPLETION: Missing merchant name');
      return;
    }

    if (!bookingId) {
      console.error('❌ BOOKING COMPLETION: Missing booking ID');
      return;
    }

    try {
      await sendBookingCompletedNotification(customerId, merchantName, bookingId);
      console.log('✅ BOOKING COMPLETION: Notification sent successfully');
    } catch (error) {
      console.error('❌ BOOKING COMPLETION: Error sending notification:', error);
    }
  }, []);

  return { onBookingCompleted };
};
