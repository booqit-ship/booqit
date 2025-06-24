
import { useCallback } from "react";
import { SimpleNotificationService } from "@/services/SimpleNotificationService";

// This hook handles all booking-related notifications with the simple notification service
export function useBookingCompletion() {
  // Called when marking booking as completed - sends review request to customer
  const onBookingCompleted = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    if (!customerId || customerId === 'undefined' || customerId.trim().length === 0) {
      console.warn('⚠️ Invalid customer ID for booking completion notification');
      return false;
    }
    
    try {
      console.log('📲 Sending booking completion notification to customer:', customerId);
      const result = await SimpleNotificationService.notifyCustomerBookingCompleted(customerId, merchantName, bookingId);
      
      console.log('📊 Booking completion notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending booking completion notification:', error);
      return false;
    }
  }, []);

  // Called when booking is confirmed - notifies customer
  const onBookingConfirmed = useCallback(async (customerId: string, merchantName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!customerId) {
      console.warn('⚠️ Invalid customer ID for booking confirmation notification');
      return false;
    }
    
    try {
      console.log('📲 Sending booking confirmation to customer:', customerId);
      const result = await SimpleNotificationService.notifyCustomerBookingConfirmed(customerId, merchantName, serviceName, `${date} at ${time}`, bookingId);
      
      console.log('📊 Booking confirmation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending booking confirmation notification:', error);
      return false;
    }
  }, []);

  // Called when merchant cancels booking - notifies customer
  const onBookingCancelled = useCallback(async (customerId: string, merchantName: string, bookingId: string, cancelledByMerchant: boolean = false) => {
    if (!customerId) {
      console.warn('⚠️ Invalid customer ID for booking cancellation notification');
      return false;
    }
    
    try {
      const message = cancelledByMerchant 
        ? `Your booking at ${merchantName} has been cancelled by the merchant. We apologize for any inconvenience.`
        : `Your booking at ${merchantName} has been cancelled.`;
      
      console.log('📲 Sending booking cancellation to customer:', customerId);
      const result = await SimpleNotificationService.notifyBookingCancelled(customerId, message, bookingId);
      
      console.log('📊 Booking cancellation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending booking cancellation notification:', error);
      return false;
    }
  }, []);

  // Called when new booking is created - notifies merchant
  const onNewBooking = useCallback(async (merchantUserId: string, customerName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!merchantUserId) {
      console.warn('⚠️ Invalid merchant user ID for new booking notification');
      return false;
    }
    
    try {
      const dateTime = `${date} at ${time}`;
      console.log('📲 Sending new booking notification to merchant:', merchantUserId);
      const result = await SimpleNotificationService.notifyMerchantOfNewBooking(merchantUserId, customerName, serviceName, dateTime, bookingId);
      
      console.log('📊 New booking notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending new booking notification:', error);
      return false;
    }
  }, []);

  return { 
    onBookingCompleted, 
    onBookingConfirmed, 
    onBookingCancelled, 
    onNewBooking 
  };
}
