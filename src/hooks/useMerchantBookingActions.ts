
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBookingCompletion } from "./useBookingCompletion";
import { toast } from "sonner";

export function useMerchantBookingActions() {
  const { onBookingCompleted, onBookingCancelled } = useBookingCompletion();

  // Handle merchant cancelling a booking
  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      console.log('🚫 Merchant cancelling booking:', bookingId);

      // Get booking details first
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants!inner(shop_name, user_id)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error('❌ Error fetching booking for cancellation:', fetchError);
        toast.error('Failed to fetch booking details');
        return false;
      }

      // Update booking status to cancelled
      const { data, error } = await supabase.functions.invoke('update-booking-status', {
        body: {
          bookingId,
          newStatus: 'cancelled',
          merchantUserId: booking.merchants.user_id
        }
      });

      if (error) {
        console.error('❌ Error cancelling booking:', error);
        toast.error('Failed to cancel booking');
        return false;
      }

      // Send notification to customer if they have a user_id (authenticated booking)
      if (booking.user_id) {
        console.log('📲 Sending cancellation notification to customer:', booking.user_id);
        const notificationResult = await onBookingCancelled(
          booking.user_id,
          booking.merchants.shop_name,
          bookingId,
          true // cancelled by merchant
        );
        
        console.log('📊 Cancellation notification result:', notificationResult);
      } else {
        console.log('ℹ️ Guest booking - no notification sent for cancellation');
      }

      toast.success('Booking cancelled successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in cancelBooking:', error);
      toast.error('Failed to cancel booking');
      return false;
    }
  }, [onBookingCancelled]);

  // Handle merchant marking booking as completed
  const completeBooking = useCallback(async (bookingId: string) => {
    try {
      console.log('✅ Merchant completing booking:', bookingId);

      // Get booking details first
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants!inner(shop_name, user_id)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error('❌ Error fetching booking for completion:', fetchError);
        toast.error('Failed to fetch booking details');
        return false;
      }

      // Update booking status to completed
      const { data, error } = await supabase.functions.invoke('update-booking-status', {
        body: {
          bookingId,
          newStatus: 'completed',
          merchantUserId: booking.merchants.user_id
        }
      });

      if (error) {
        console.error('❌ Error completing booking:', error);
        toast.error('Failed to complete booking');
        return false;
      }

      // Send review request notification to customer if they have a user_id (authenticated booking)
      if (booking.user_id) {
        console.log('📲 Sending review request to customer:', booking.user_id);
        const notificationResult = await onBookingCompleted(
          booking.user_id,
          booking.merchants.shop_name,
          bookingId
        );
        
        console.log('📊 Review request notification result:', notificationResult);
      } else {
        console.log('ℹ️ Guest booking - no review request sent');
      }

      toast.success('Booking marked as completed');
      return true;
    } catch (error) {
      console.error('❌ Error in completeBooking:', error);
      toast.error('Failed to complete booking');
      return false;
    }
  }, [onBookingCompleted]);

  return {
    cancelBooking,
    completeBooking
  };
}
