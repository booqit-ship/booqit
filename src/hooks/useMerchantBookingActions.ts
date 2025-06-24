
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedNotificationService } from "@/services/EnhancedNotificationService";
import { toast } from "sonner";
import { formatTimeToAmPm } from "@/utils/timeUtils";
import { formatDateInIST } from "@/utils/dateUtils";

export function useMerchantBookingActions() {
  // ✅ Scenario 4: Merchant cancels → Customer gets "Booking Canceled"
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

      // ✅ Enhanced notification for customer
      if (booking.user_id) {
        console.log('📲 Sending enhanced cancellation notification to customer:', booking.user_id);
        
        // Get service name from booking
        const serviceName = booking.services?.[0]?.name || 'Service';
        const timeFormatted = formatTimeToAmPm(booking.time_slot);
        const dateFormatted = formatDateInIST(new Date(booking.date), 'MMM d, yyyy');
        const dateTimeFormatted = `${dateFormatted} at ${timeFormatted}`;
        
        const notificationResult = await EnhancedNotificationService.notifyCustomerBookingCanceled(
          booking.user_id,
          booking.merchants.shop_name,
          serviceName,
          dateTimeFormatted,
          bookingId,
          'Merchant canceled the appointment'
        );
        
        console.log('📊 Enhanced cancellation notification result:', notificationResult);
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
  }, []);

  // ✅ Scenario 5: Merchant completes → Customer gets "Review Request"
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

      // ✅ Enhanced notification for customer review request
      if (booking.user_id) {
        console.log('📲 Sending enhanced review request to customer:', booking.user_id);
        const notificationResult = await EnhancedNotificationService.notifyCustomerServiceCompleted(
          booking.user_id,
          booking.merchants.shop_name,
          bookingId
        );
        
        console.log('📊 Enhanced review request notification result:', notificationResult);
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
  }, []);

  return {
    cancelBooking,
    completeBooking
  };
}
