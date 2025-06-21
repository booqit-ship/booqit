
import { useCallback } from "react";
import { ConsolidatedNotificationService } from "@/services/consolidatedNotificationService";

// Define a type for the booking completion data
interface BookingCompletionData {
  customerId: string;
  merchantName: string;
  bookingId: string;
}

// This hook is called when a booking is marked completed.
export function useBookingCompletion() {
  // Call this when marking booking as completed.
  const onBookingCompleted = useCallback(async (customerId: string, merchantName: string, bookingId: string) => {
    console.log('🎯 BOOKING COMPLETION: Sending notification to customer:', { customerId, merchantName, bookingId });
    
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
      
      if (success) {
        console.log('✅ BOOKING COMPLETION: Notification sent successfully');
      } else {
        console.log('❌ BOOKING COMPLETION: Failed to send notification');
      }
    } catch (error) {
      console.error('❌ BOOKING COMPLETION: Error sending notification:', error);
    }
  }, []);

  return { onBookingCompleted };
}
