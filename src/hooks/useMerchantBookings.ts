import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Merchant } from '@/types';
import { SimpleNotificationService } from '@/services/SimpleNotificationService';

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
      const { data, error } = await supabase.rpc('update_booking_status_and_release_slots', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_merchant_user_id: user.id
      });

      if (error) throw error;

      // Send notifications using simple service
      const booking = bookings.find(b => b.id === bookingId);
      if (booking && booking.user_id) {
        if (newStatus === 'completed') {
          await SimpleNotificationService.notifyCustomerBookingCompleted(
            booking.user_id,
            merchant?.shop_name || 'Your salon',
            bookingId
          );
        } else if (newStatus === 'cancelled') {
          await SimpleNotificationService.notifyBookingCancelled(
            booking.user_id,
            `Your booking at ${merchant?.shop_name || 'the salon'} has been cancelled.`,
            bookingId
          );
      }
    }

      toast.success(`Booking ${newStatus} successfully`);
      await fetchBookings();
    } catch (error: any) {
      console.error('Error updating booking status:', error);
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
