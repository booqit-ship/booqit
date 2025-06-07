
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';

export const useMerchantData = (userId: string | null) => {
  return useQuery({
    queryKey: ['merchant', userId],
    queryFn: async (): Promise<Merchant | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No merchant found - this is expected for new users
          return null;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

export const usePrefetchMerchantData = () => {
  const queryClient = useQueryClient();
  
  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['merchant', userId],
      queryFn: async (): Promise<Merchant | null> => {
        const { data, error } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return null;
          }
          throw error;
        }
        
        return data;
      },
      staleTime: 10 * 60 * 1000,
    });
  };
};
