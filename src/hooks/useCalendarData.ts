
import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use refs to prevent memory leaks
  const abortController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Fetch merchant ID with cleanup
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId || !isMounted.current) return;
      
      try {
        // Abort previous request if any
        if (abortController.current) {
          abortController.current.abort();
        }
        abortController.current = new AbortController();

        const { data: merchant, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (error || !isMounted.current) {
          console.error('Error fetching merchant:', error);
          return;
        }
        
        if (merchant && isMounted.current) {
          setMerchantId(merchant.id);
        }
      } catch (error) {
        if (isMounted.current) {
          console.error('Error:', error);
        }
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Fetch holidays with cleanup
  const fetchHolidays = useCallback(async () => {
    if (!merchantId || !isMounted.current) return;
    
    setHolidaysLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('holiday_date', { ascending: true });
        
      if (error || !isMounted.current) {
        console.error('Error fetching holidays:', error);
        return;
      }
      
      if (isMounted.current) {
        setHolidays(data || []);
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Error:', error);
      }
    } finally {
      if (isMounted.current) {
        setHolidaysLoading(false);
      }
    }
  }, [merchantId]);

  useEffect(() => {
    if (merchantId) {
      fetchHolidays();
    }
  }, [merchantId, fetchHolidays]);

  // Optimized booking fetch with cleanup
  const fetchBookings = useCallback(async () => {
    if (!userId || !merchantId || !isMounted.current) return;
    
    setLoading(true);
    
    try {
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          service:services(name, price),
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
        .eq('status', 'confirmed')
        .order('time_slot');
        
      if (error || !isMounted.current) {
        console.error('Error fetching bookings:', error);
        return;
      }
      
      // Ensure proper typing and component is still mounted
      const typedBookings: BookingWithCustomer[] = data ? data.map(booking => ({
        id: booking.id,
        service: booking.service as { name: string; price: number },
        time_slot: booking.time_slot,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        stylist_name: booking.stylist_name,
        created_at: booking.created_at
      })) : [];
      
      if (isMounted.current) {
        setBookings(typedBookings);
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Error in fetchBookings:', error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId, merchantId, selectedDate]);

  useEffect(() => {
    if (merchantId) {
      fetchBookings();
    }
  }, [selectedDate, merchantId, fetchBookings]);

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!isMounted.current) return;
    
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
      if (isMounted.current) {
        fetchHolidays();
      }
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
