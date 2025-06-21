import { useBookingNotifications } from "@/hooks/useBookingNotifications";

// Define a type for the booking completion data
interface BookingCompletionData {
  customerId: string;
  merchantName: string;
  bookingId: string;
}

// This hook is called when a booking is marked completed.
export function useBookingCompletion() {
  const { notifyBookingComplete } = useBookingNotifications();

  // Call this when marking booking as completed.
  const onBookingCompleted = (customerId: string, merchantName: string, bookingId: string) => {
    notifyBookingComplete(customerId, merchantName, bookingId);
    // Here you can add any other logic that needs to be executed after a booking is completed
    // For example, you might want to update the booking status in the database
    // or send a confirmation email to the customer.
  };

  return { onBookingCompleted };
}
