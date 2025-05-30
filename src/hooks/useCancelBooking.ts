
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
      console.log('Cancelling booking:', bookingId);
      
      const { data, error } = await supabase.rpc('cancel_booking_and_release_slots', {
        p_booking_id: bookingId,
        p_user_id: userId || null
      });

      if (error) {
        console.error('Cancel booking error:', error);
        throw new Error(error.message);
      }

      // Safely handle the response data
      const result = data as unknown as CancelBookingResult;
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to cancel booking');
      }

      console.log('Booking cancelled successfully:', result);
      toast.success(`${result.message || 'Booking cancelled successfully'} (${result.slots_released || 0} slots released)`);
      
      // Force a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      toast.error(error.message || 'Failed to cancel booking. Please try again.');
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
