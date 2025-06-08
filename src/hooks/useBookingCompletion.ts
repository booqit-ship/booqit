
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendBookingCompletionNotification } from '@/services/eventNotificationService';

export const useBookingCompletion = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const markBookingComplete = async (bookingId: string) => {
    setIsUpdating(true);
    try {
      console.log('✅ Marking booking as complete:', bookingId);

      // First, get booking details for notification
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          users!bookings_user_id_fkey(id, email),
          profiles!inner(id, name),
          merchants!inner(shop_name, user_id)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Error fetching booking details:', bookingError);
        toast.error('Failed to fetch booking details');
        return false;
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking status:', updateError);
        toast.error('Failed to mark booking as complete');
        return false;
      }

      // Send completion notification to customer
      if (booking.profiles?.name && booking.merchants?.shop_name) {
        await sendBookingCompletionNotification(
          booking.user_id,
          booking.merchants.shop_name,
          bookingId
        );
      }

      toast.success('✅ Booking marked as complete! Customer will be notified to leave a review.');
      return true;
    } catch (error) {
      console.error('Error in markBookingComplete:', error);
      toast.error('Failed to complete booking');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    markBookingComplete,
    isUpdating
  };
};
