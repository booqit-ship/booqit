
import { useCallback } from "react";
import { EnhancedNotificationService } from "@/services/EnhancedNotificationService";
import { formatTimeToAmPm } from "@/utils/timeUtils";
import { formatDateInIST } from "@/utils/dateUtils";

// Enhanced booking completion hook with all notification scenarios
export function useBookingCompletion() {
  // ✅ Scenario 5: Called when marking booking as completed - sends review request to customer
  const onBookingCompleted = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    if (!customerId || customerId === 'undefined' || customerId.trim().length === 0) {
      console.warn('⚠️ Invalid customer ID for booking completion notification');
      return false;
    }
    
    try {
      console.log('📲 Sending enhanced booking completion notification to customer:', customerId);
      const result = await EnhancedNotificationService.notifyCustomerServiceCompleted(customerId, merchantName, bookingId);
      
      console.log('📊 Enhanced booking completion notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending enhanced booking completion notification:', error);
      return false;
    }
  }, []);

  // ✅ Scenario 1: Called when booking is confirmed - notifies customer
  const onBookingConfirmed = useCallback(async (customerId: string, merchantName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!customerId) {
      console.warn('⚠️ Invalid customer ID for booking confirmation notification');
      return false;
    }
    
    try {
      console.log('📲 Sending enhanced booking confirmation to customer:', customerId);
      const timeFormatted = formatTimeToAmPm(time);
      const dateFormatted = formatDateInIST(new Date(date), 'MMM d, yyyy');
      const dateTimeFormatted = `${dateFormatted} at ${timeFormatted}`;
      
      const result = await EnhancedNotificationService.notifyCustomerBookingConfirmed(customerId, merchantName, serviceName, dateTimeFormatted, bookingId);
      
      console.log('📊 Enhanced booking confirmation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending enhanced booking confirmation notification:', error);
      return false;
    }
  }, []);

  // ✅ Scenario 3: Called when customer cancels booking - notifies merchant
  const onCustomerCancelsBooking = useCallback(async (merchantUserId: string, customerName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!merchantUserId) {
      console.warn('⚠️ Invalid merchant user ID for customer cancellation notification');
      return false;
    }
    
    try {
      console.log('📲 Sending enhanced customer cancellation notification to merchant:', merchantUserId);
      const timeFormatted = formatTimeToAmPm(time);
      const dateFormatted = formatDateInIST(new Date(date), 'MMM d, yyyy');
      const dateTimeFormatted = `${dateFormatted} at ${timeFormatted}`;
      
      const result = await EnhancedNotificationService.notifyMerchantBookingCanceled(merchantUserId, customerName, serviceName, dateTimeFormatted, bookingId);
      
      console.log('📊 Enhanced customer cancellation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending enhanced customer cancellation notification:', error);
      return false;
    }
  }, []);

  // ✅ Scenario 4: Called when merchant cancels booking - notifies customer
  const onMerchantCancelsBooking = useCallback(async (customerId: string, merchantName: string, serviceName: string, date: string, time: string, bookingId: string, reason?: string) => {
    if (!customerId) {
      console.warn('⚠️ Invalid customer ID for merchant cancellation notification');
      return false;
    }
    
    try {
      console.log('📲 Sending enhanced merchant cancellation notification to customer:', customerId);
      const timeFormatted = formatTimeToAmPm(time);
      const dateFormatted = formatDateInIST(new Date(date), 'MMM d, yyyy');
      const dateTimeFormatted = `${dateFormatted} at ${timeFormatted}`;
      
      const result = await EnhancedNotificationService.notifyCustomerBookingCanceled(customerId, merchantName, serviceName, dateTimeFormatted, bookingId, reason);
      
      console.log('📊 Enhanced merchant cancellation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending enhanced merchant cancellation notification:', error);
      return false;
    }
  }, []);

  // ✅ Scenario 2: Called when new booking is created - notifies merchant
  const onNewBooking = useCallback(async (merchantUserId: string, customerName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!merchantUserId) {
      console.warn('⚠️ Invalid merchant user ID for new booking notification');
      return false;
    }
    
    try {
      console.log('📲 Sending enhanced new booking notification to merchant:', merchantUserId);
      const timeFormatted = formatTimeToAmPm(time);
      const dateFormatted = formatDateInIST(new Date(date), 'MMM d, yyyy');
      const dateTimeFormatted = `${dateFormatted} at ${timeFormatted}`;
      
      const result = await EnhancedNotificationService.notifyMerchantNewBooking(merchantUserId, customerName, serviceName, dateTimeFormatted, bookingId);
      
      console.log('📊 Enhanced new booking notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending enhanced new booking notification:', error);
      return false;
    }
  }, []);

  // ✅ Merchant cancellation - alias for onMerchantCancelsBooking
  const onBookingCancelled = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    if (!customerId) {
      console.warn('⚠️ Invalid customer ID for booking cancellation notification');
      return false;
    }
    
    try {
      console.log('📲 Sending booking cancellation notification to customer:', customerId);
      const result = await EnhancedNotificationService.notifyCustomerBookingCanceled(
        customerId, 
        merchantName, 
        'Service', // Default service name
        'your appointment time', // Default time text
        bookingId
      );
      
      console.log('📊 Booking cancellation notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending booking cancellation notification:', error);
      return false;
    }
  }, []);

  return { 
    onBookingCompleted, 
    onBookingConfirmed, 
    onCustomerCancelsBooking,
    onMerchantCancelsBooking,
    onNewBooking,
    onBookingCancelled
  };
}
