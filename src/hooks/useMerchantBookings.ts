
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Merchant } from '@/types';
import { NotificationTemplateService } from '@/services/NotificationTemplateService';

interface Booking {
  id: string;
  created_at: string;
  user_id: string;
  merchant_id: string;
  service_id: string;
  staff_id: string;
  date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
}

export const useMerchantBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMerchantInfo();
      fetchBookings();
    }
  }, [user?.id]);

  const fetchMerchantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching merchant info:', error);
        setError(error.message);
      } else {
        setMerchant(data);
      }
    } catch (error: any) {
      console.error('Unexpected error fetching merchant info:', error);
      setError(error.message);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('merchant_id', merchant?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        setError(error.message);
      } else {
        setBookings(data || []);
      }
    } catch (error: any) {
      console.error('Unexpected error fetching bookings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (!user?.id) return;

    try {
      console.log(`🔄 MERCHANT: Updating booking ${bookingId} to ${newStatus}`);

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
        return;
      }

      // Use the standardized RPC function
      const { data: updateResult, error: updateError } = await supabase.rpc('update_booking_status_and_release_slots', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_merchant_user_id: user.id
      });

      if (updateError) {
        console.error('❌ MERCHANT: Error updating booking status:', updateError);
        throw updateError;
      }

      if (!updateResult?.success) {
        console.error('❌ MERCHANT: Status update failed:', updateResult?.error);
        throw new Error(updateResult?.error || 'Failed to update booking status');
      }

      // ✅ Send standardized notifications
      try {
        if (bookingData.user_id) { // Only for authenticated users
          const dateTimeFormatted = NotificationTemplateService.formatDateTime(
            bookingData.date, 
            bookingData.time_slot
          );

          if (newStatus === 'completed') {
            await NotificationTemplateService.sendStandardizedNotification(
              bookingData.user_id,
              'booking_completed',
              {
                type: 'booking_completed',
                bookingId,
                shopName: bookingData.merchants?.shop_name || 'Shop',
                serviceName: '',
                dateTime: ''
              }
            );
            console.log('📧 MERCHANT: Review request sent');
          } else if (newStatus === 'cancelled') {
            await NotificationTemplateService.sendStandardizedNotification(
              bookingData.user_id,
              'booking_cancelled',
              {
                type: 'booking_cancelled',
                bookingId,
                shopName: bookingData.merchants?.shop_name || 'Shop',
                serviceName: bookingData.services?.name || 'Service',
                dateTime: dateTimeFormatted
              }
            );
            console.log('📧 MERCHANT: Cancellation notification sent');
          }
        } else {
          console.log('ℹ️ MERCHANT: Guest booking - no notification sent');
        }
      } catch (notificationError) {
        console.error('❌ MERCHANT: Notification error:', notificationError);
        // Don't fail the status update for notification issues
      }

      toast.success(`Booking ${newStatus} successfully`);
      await fetchBookings();
    } catch (error: any) {
      console.error('❌ MERCHANT: Error updating booking status:', error);
      toast.error(error.message || 'Failed to update booking status');
    }
  };

  return {
    bookings,
    loading,
    error,
    fetchBookings,
    updateBookingStatus
  };
};
