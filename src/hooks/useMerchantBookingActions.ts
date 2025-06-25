
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationTemplateService } from "@/services/NotificationTemplateService";
import { toast } from "sonner";

interface BookingActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export function useMerchantBookingActions() {
  // ✅ Scenario 4: Merchant cancels → Customer gets "Booking Canceled"
  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      console.log('🚫 MERCHANT: Cancelling booking:', bookingId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('You must be logged in to cancel bookings');
        return false;
      }

      // Get booking details first for notifications
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants!inner(shop_name, user_id),
          services!inner(name)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ MERCHANT: Error fetching booking:', fetchError);
        toast.error('Failed to fetch booking details');
        return false;
      }

      // Verify merchant ownership
      if (bookingData.merchants.user_id !== user.id) {
        console.error('❌ MERCHANT: Unauthorized cancellation attempt');
        toast.error('Unauthorized');
        return false;
      }

      // Use the standardized RPC function for cancellation
      const { data: cancelResult, error: cancelError } = await supabase.rpc('update_booking_status_and_release_slots', {
        p_booking_id: bookingId,
        p_new_status: 'cancelled',
        p_merchant_user_id: user.id
      });

      if (cancelError) {
        console.error('❌ MERCHANT: Error cancelling booking:', cancelError);
        toast.error('Failed to cancel booking');
        return false;
      }

      // Type cast the response
      const cancelResponse = cancelResult as BookingActionResponse;

      if (!cancelResponse?.success) {
        console.error('❌ MERCHANT: Cancellation failed:', cancelResponse?.error);
        toast.error(cancelResponse?.error || 'Failed to cancel booking');
        return false;
      }

      console.log('✅ MERCHANT: Booking cancelled successfully');

      // ✅ Send standardized notifications
      try {
        const dateTimeFormatted = NotificationTemplateService.formatDateTime(
          bookingData.date, 
          bookingData.time_slot
        );

        // Notify customer about cancellation (only for authenticated users)
        if (bookingData.user_id) {
          await NotificationTemplateService.sendStandardizedNotification(
            bookingData.user_id,
            'booking_cancelled',
            {
              type: 'booking_cancelled',
              bookingId,
              shopName: bookingData.merchants.shop_name || 'Shop',
              serviceName: bookingData.services?.name || 'Service',
              dateTime: dateTimeFormatted
            }
          );
          console.log('📧 MERCHANT: Customer notification sent');
        } else {
          console.log('ℹ️ MERCHANT: Guest booking - no notification sent');
        }
      } catch (notificationError) {
        console.error('❌ MERCHANT: Notification error:', notificationError);
        // Don't fail the cancellation for notification issues
      }

      toast.success('Booking cancelled successfully');
      return true;
    } catch (error) {
      console.error('❌ MERCHANT: Unexpected error in cancelBooking:', error);
      toast.error('Failed to cancel booking');
      return false;
    }
  }, []);

  // ✅ Scenario 5: Merchant completes → Customer gets "Review Request"
  const completeBooking = useCallback(async (bookingId: string) => {
    try {
      console.log('✅ MERCHANT: Completing booking:', bookingId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('You must be logged in to complete bookings');
        return false;
      }

      // Get booking details first for notifications
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants!inner(shop_name, user_id)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ MERCHANT: Error fetching booking:', fetchError);
        toast.error('Failed to fetch booking details');
        return false;
      }

      // Verify merchant ownership
      if (bookingData.merchants.user_id !== user.id) {
        console.error('❌ MERCHANT: Unauthorized completion attempt');
        toast.error('Unauthorized');
        return false;
      }

      // Use the standardized RPC function for completion
      const { data: completeResult, error: completeError } = await supabase.rpc('update_booking_status_and_release_slots', {
        p_booking_id: bookingId,
        p_new_status: 'completed',
        p_merchant_user_id: user.id
      });

      if (completeError) {
        console.error('❌ MERCHANT: Error completing booking:', completeError);
        toast.error('Failed to complete booking');
        return false;
      }

      // Type cast the response
      const completeResponse = completeResult as BookingActionResponse;

      if (!completeResponse?.success) {
        console.error('❌ MERCHANT: Completion failed:', completeResponse?.error);
        toast.error(completeResponse?.error || 'Failed to complete booking');
        return false;
      }

      console.log('✅ MERCHANT: Booking completed successfully');

      // ✅ Send standardized review request (only for authenticated users)
      try {
        if (bookingData.user_id) {
          await NotificationTemplateService.sendStandardizedNotification(
            bookingData.user_id,
            'booking_completed',
            {
              type: 'booking_completed',
              bookingId,
              shopName: bookingData.merchants.shop_name || 'Shop',
              serviceName: '',
              dateTime: ''
            }
          );
          console.log('📧 MERCHANT: Review request sent to customer');
        } else {
          console.log('ℹ️ MERCHANT: Guest booking - no review request sent');
        }
      } catch (notificationError) {
        console.error('❌ MERCHANT: Notification error:', notificationError);
        // Don't fail the completion for notification issues
      }

      toast.success('Booking marked as completed');
      return true;
    } catch (error) {
      console.error('❌ MERCHANT: Unexpected error in completeBooking:', error);
      toast.error('Failed to complete booking');
      return false;
    }
  }, []);

  return {
    cancelBooking,
    completeBooking
  };
}
