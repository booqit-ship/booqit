
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMerchantData } from './useMerchantData';
import { useBookingsData, useInvalidateBookingsData } from './useBookingsData';
import { formatDateInIST } from '@/utils/dateUtils';

export const useHolidaysData = (merchantId: string | null) => {
  return useQuery({
    queryKey: ['shop_holidays', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      
      const { data, error } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('holiday_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000, // 5 minutes for holidays
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });
};

export const useOptimizedCalendarData = (userId: string | null, selectedDate: Date) => {
  const queryClient = useQueryClient();
  const invalidateBookings = useInvalidateBookingsData();
  
  // Get merchant data
  const { data: merchant, isLoading: merchantLoading } = useMerchantData(userId);
  const merchantId = merchant?.id;
  
  // Get bookings for selected date
  const { data: bookings = [], isLoading: bookingsLoading } = useBookingsData(merchantId, selectedDate);
  
  // Get holidays
  const { data: holidays = [], isLoading: holidaysLoading } = useHolidaysData(merchantId);
  
  const fetchBookings = () => {
    if (merchantId) {
      invalidateBookings(merchantId, selectedDate);
    }
  };
  
  const fetchHolidays = () => {
    if (merchantId) {
      queryClient.invalidateQueries({ queryKey: ['shop_holidays', merchantId] });
      queryClient.refetchQueries({ queryKey: ['shop_holidays', merchantId] });
    }
  };
  
  const handleDeleteHoliday = async (holidayId: string) => {
    const { error } = await supabase
      .from('shop_holidays')
      .delete()
      .eq('id', holidayId);
    
    if (!error) {
      fetchHolidays();
    }
    
    return !error;
  };
  
  return {
    bookings,
    loading: bookingsLoading,
    merchantId,
    holidays,
    holidaysLoading,
    fetchBookings,
    fetchHolidays,
    handleDeleteHoliday,
    merchant,
    merchantLoading
  };
};
