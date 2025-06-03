
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CancelBookingResult {
  success: boolean;
  error?: string;
  message?: string;
  slots_released?: number;
}

export const useCancelBooking = () => {
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelBooking = async (bookingId: string, userId?: string): Promise<boolean> => {
    setIsCancelling(true);
    
    try {
      console.log('Cancelling booking:', bookingId, 'for user:', userId);
      
      // Use the correct function name that exists in the database
      const { data, error } = await supabase.rpc('cancel_booking_and_release_all_slots', {
        p_booking_id: bookingId,
        p_user_id: userId || null
      });

      if (error) {
        console.error('Cancel booking error:', error);
        
        // Provide specific error messages based on error details
        if (error.message.includes('not found') || error.message.includes('unauthorized')) {
          toast.error('Booking not found or you are not authorized to cancel it');
        } else if (error.message.includes('completed')) {
          toast.error('Cannot cancel completed booking');
        } else {
          toast.error(`Failed to cancel booking: ${error.message}`);
        }
        return false;
      }

      console.log('Cancel booking response:', data);
      
      // Type the response data properly
      const result = data as unknown as CancelBookingResult;
      
      if (!result || !result.success) {
        const errorMessage = result?.error || 'Failed to cancel booking';
        console.error('Booking cancellation failed:', errorMessage);
        
        // Provide specific error messages
        if (errorMessage.includes('completed')) {
          toast.error('Cannot cancel booking because it\'s already completed');
        } else if (errorMessage.includes('not found') || errorMessage.includes('unauthorized')) {
          toast.error('Booking not found or you are not authorized to cancel it');
        } else {
          toast.error(errorMessage);
        }
        return false;
      }

      console.log('Booking cancelled successfully:', result);
      toast.success(`${result.message || 'Booking cancelled successfully'}${result.slots_released ? ` (${result.slots_released} slots released)` : ''}`);
      
      // Force a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      toast.error('Failed to cancel booking. Please try again.');
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    cancelBooking,
    isCancelling
  };
};
