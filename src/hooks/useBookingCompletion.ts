
import { useCallback } from "react";
import { ConsolidatedNotificationService } from "@/services/consolidatedNotificationService";

// Define a type for the booking completion data
interface BookingCompletionData {
  customerId: string;
  merchantName: string;
  bookingId: string;
}

// This hook handles all booking-related notifications
export function useBookingCompletion() {
  // Called when marking booking as completed
  const onBookingCompleted = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    if (!customerId || customerId === 'undefined' || customerId.trim().length === 0) {
      return;
    }
    
    try {
      const success = await ConsolidatedNotificationService.sendNotification(customerId, {
        title: "✨ Looking fabulous? We hope so!",
        body: `How was your experience at ${merchantName}? Share your thoughts and help others discover great service! 💫`,
        data: {
          type: 'booking_completed',
          bookingId,
          merchantName,
          action: 'review'
        }
      });
      
      return success;
    } catch (error) {
      console.error('Error sending booking completion notification:', error);
      return false;
    }
  }, []);

  // Called when booking is confirmed
  const onBookingConfirmed = useCallback(async (customerId: string, merchantName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!customerId) return false;
    
    try {
      return await ConsolidatedNotificationService.sendNotification(customerId, {
        title: "🎉 Booking Confirmed!",
        body: `Your appointment at ${merchantName} for ${serviceName} on ${date} at ${time} is confirmed!`,
        data: {
          type: 'booking_confirmed',
          bookingId
        }
      });
    } catch (error) {
      console.error('Error sending booking confirmation notification:', error);
      return false;
    }
  }, []);

  // Called when booking is cancelled
  const onBookingCancelled = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    if (!customerId) return false;
    
    try {
      return await ConsolidatedNotificationService.sendNotification(customerId, {
        title: "Booking Cancelled",
        body: `Your booking at ${merchantName} has been cancelled. We apologize for any inconvenience.`,
        data: {
          type: 'booking_cancelled',
          bookingId
        }
      });
    } catch (error) {
      console.error('Error sending booking cancellation notification:', error);
      return false;
    }
  }, []);

  // Called when new booking is created (notify merchant)
  const onNewBooking = useCallback(async (merchantUserId: string, customerName: string, serviceName: string, date: string, time: string, bookingId: string) => {
    if (!merchantUserId) return false;
    
    try {
      return await ConsolidatedNotificationService.sendNotification(merchantUserId, {
        title: "New Booking! 📅",
        body: `${customerName} has booked ${serviceName} for ${date} at ${time}`,
        data: {
          type: 'new_booking',
          bookingId
        }
      });
    } catch (error) {
      console.error('Error sending new booking notification:', error);
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
