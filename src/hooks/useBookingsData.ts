
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateInIST } from '@/utils/dateUtils';

export const useBookingsData = (merchantId: string | null, selectedDate: Date) => {
  const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['bookings', merchantId, dateStr],
    queryFn: async () => {
      if (!merchantId) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (name, price, duration),
          staff (name),
          users (email, full_name)
        `)
        .eq('merchant_id', merchantId)
        .eq('date', dateStr)
        .order('time_slot', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000, // 2 minutes for bookings (more dynamic data)
    retry: 1,
  });
};
