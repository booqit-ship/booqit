
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingStatusResult {
  success: boolean;
  error?: string;
  message?: string;
  booking?: {
    id: string;
    status: string;
    updated_at: string;
  };
}

export const useBookingStatus = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateBookingStatus = async (
    bookingId: string, 
    newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled',
    userId?: string
  ): Promise<boolean> => {
    setIsUpdating(true);
    
    try {
      console.log('Updating booking status:', { bookingId, newStatus, userId });
      
      const { data, error } = await supabase.rpc('update_booking_status_with_slot_management', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_user_id: userId || null
      });

      if (error) {
        console.error('Status update error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as BookingStatusResult;
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to update booking status');
      }

      console.log('Booking status updated successfully:', result);
      toast.success(result.message || `Booking ${newStatus} successfully`);
      
      return true;
    } catch (error: any) {
      console.error('Booking status update error:', error);
      toast.error(error.message || 'Failed to update booking status');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateBookingStatus,
    isUpdating
  };
};
