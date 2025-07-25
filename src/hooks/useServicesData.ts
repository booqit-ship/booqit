
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useServicesData = (merchantId: string | null) => {
  return useQuery({
    queryKey: ['services', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });
};

export const useStaffData = (merchantId: string | null) => {
  return useQuery({
    queryKey: ['staff', merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });
};

export const useInvalidateServicesData = () => {
  const queryClient = useQueryClient();
  
  return (merchantId: string) => {
    queryClient.invalidateQueries({ queryKey: ['services', merchantId] });
    queryClient.invalidateQueries({ queryKey: ['staff', merchantId] });
    
    // Also refetch immediately
    queryClient.refetchQueries({ queryKey: ['services', merchantId] });
    queryClient.refetchQueries({ queryKey: ['staff', merchantId] });
  };
};
