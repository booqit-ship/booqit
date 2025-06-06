
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDateInIST } from '@/utils/dateUtils';

interface BookingWithCustomer {
  id: string;
  service?: {
    name: string;
    price: number;
  };
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
  created_at: string;
}

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
  created_at: string;
}

export const useCalendarData = (userId: string | null, selectedDate: Date) => {
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Fetch merchant ID
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;
      
      try {
        const { data: merchant, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching merchant:', error);
          return;
        }
        
        if (merchant) {
          setMerchantId(merchant.id);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Fetch holidays
  const fetchHolidays = async () => {
    if (!merchantId) return;
    
    setHolidaysLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('holiday_date', { ascending: true });
        
      if (error) {
        console.error('Error fetching holidays:', error);
        return;
      }
      
      setHolidays(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setHolidaysLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [merchantId]);

  // Modified to only fetch confirmed bookings, not pending ones
  const fetchBookings = useCallback(async () => {
    if (!userId || !merchantId) return;
    
    setLoading(true);
    
    try {
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          service:services(name),
          staff_id,
          stylist_name,
          date,
          time_slot,
          status,
          payment_status,
          customer_name,
          customer_phone,
          customer_email,
          created_at
        `)
        .eq('merchant_id', merchantId)
        .eq('date', dateStr)
        .eq('status', 'confirmed') // Only get confirmed bookings
        .order('time_slot');
        
      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }
      
      // Ensure the data matches the BookingWithCustomer interface
      const typedBookings: BookingWithCustomer[] = data ? data.map(booking => ({
        id: booking.id,
        service: booking.service,
        time_slot: booking.time_slot,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        stylist_name: booking.stylist_name,
        created_at: booking.created_at
      })) : [];
      
      setBookings(typedBookings);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, merchantId, selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, merchantId]);

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .delete()
        .eq('id', holidayId);

      if (error) {
        console.error('Error deleting holiday:', error);
        toast.error('Failed to delete holiday');
        return;
      }

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  return {
    bookings,
    loading,
    merchantId,
    holidays,
    holidaysLoading,
    fetchBookings,
    fetchHolidays,
    handleDeleteHoliday,
  };
};
