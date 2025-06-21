
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
    console.log('🎯 BOOKING COMPLETION HOOK: Sending notification to CUSTOMER:', { 
      customerId, 
      merchantName, 
      bookingId,
      isCustomerIdValid: !!customerId && customerId !== 'undefined' && customerId.length > 0
    });
    
    // Validate customer ID
    if (!customerId || customerId === 'undefined' || customerId.trim().length === 0) {
      console.error('❌ BOOKING COMPLETION: Invalid customer ID provided:', customerId);
      return;
    }
    
    try {
      console.log('📤 BOOKING COMPLETION: Calling ConsolidatedNotificationService with customer ID:', customerId);
      
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
        console.log('✅ BOOKING COMPLETION: Notification sent successfully to customer:', customerId);
      } else {
        console.log('❌ BOOKING COMPLETION: Failed to send notification to customer:', customerId);
      }
    } catch (error) {
      console.error('❌ BOOKING COMPLETION: Error sending notification to customer:', customerId, error);
    }
  }, []);

  return { onBookingCompleted };
}
