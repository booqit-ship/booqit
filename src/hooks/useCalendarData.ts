
import { useState, useEffect } from 'react';
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

  // Generate slots for selected date
  useEffect(() => {
    const generateSlots = async () => {
      if (!merchantId || !selectedDate) return;
      
      try {
        // Use IST date formatting for consistency with backend
        const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Generating slots for:', dateStr);
        
        const { data, error } = await supabase.rpc('get_dynamic_available_slots', {
          p_merchant_id: merchantId,
          p_date: dateStr,
          p_staff_id: null
        });
        
        if (error) {
          console.error('Error with slot generation:', error);
        } else {
          console.log('Slot generation completed for:', dateStr);
        }
      } catch (error) {
        console.error('Error generating slots:', error);
      }
    };
    
    generateSlots();
  }, [merchantId, selectedDate]);

  // Fetch bookings for selected date
  const fetchBookings = async () => {
    if (!merchantId) return;
    
    setLoading(true);
    try {
      // Use IST date formatting for consistency with backend
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          time_slot,
          status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          created_at,
          service:services(name, price)
        `)
        .eq('merchant_id', merchantId)
        .eq('date', selectedDateStr)
        .order('time_slot', { ascending: true });
        
      if (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
        return;
      }
      
      const typedBookings = (data || []).map(booking => ({
        ...booking,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
      }));
      
      setBookings(typedBookings);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

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
