
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendBookingCompletedNotification } from '@/services/eventNotificationService';

export const useBookingCompletion = () => {
  const completeBooking = useCallback(async (bookingId: string, merchantUserId: string) => {
    try {
      console.log('⚡ About to complete booking:', bookingId);
      
      // Update booking status to completed
      const { data: updateResult, error: updateError } = await supabase.rpc(
        'update_booking_status_with_slot_management',
        {
          p_booking_id: bookingId,
          p_new_status: 'completed',
          p_user_id: merchantUserId
        }
      );

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError);
        throw updateError;
      }

      console.log('✅ Booking status updated to completed');

      // Get booking details for notification
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          customer_name,
          merchants!inner(shop_name)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('❌ Error fetching booking details:', bookingError);
        return updateResult;
      }

      // Send completion notification to customer
      if (booking?.user_id && booking?.merchants?.shop_name) {
        console.log('⚡ About to send booking completion notification to customer:', booking.user_id);
        await sendBookingCompletedNotification(
          booking.user_id,
          booking.merchants.shop_name,
          bookingId
        );
        console.log('✅ Booking completion notification sent to customer');
      }

      return updateResult;
    } catch (error) {
      console.error('❌ Error in completeBooking:', error);
      throw error;
    }
  }, []);

  return { completeBooking };
};
