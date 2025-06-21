
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateInIST } from '@/utils/dateUtils';

export const useBookingsData = (merchantId: string | null, selectedDate: Date) => {
  const queryClient = useQueryClient();
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
    staleTime: 30 * 1000, // 30 seconds instead of 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
    retry: 2,
    refetchInterval: 60 * 1000, // Refetch every minute when page is active
  });
};

export const useInvalidateBookingsData = () => {
  const queryClient = useQueryClient();
  
  return (merchantId: string, date?: Date) => {
    if (date) {
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ['bookings', merchantId, dateStr] });
    } else {
      // Invalidate all booking queries for this merchant
      queryClient.invalidateQueries({ queryKey: ['bookings', merchantId] });
    }
    
    // Also refetch immediately
    queryClient.refetchQueries({ queryKey: ['bookings', merchantId] });
  };
};
