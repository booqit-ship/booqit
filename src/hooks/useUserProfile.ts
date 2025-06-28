
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { userId, isAuthenticated } = useAuth();

  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      console.log('🔍 Fetching profile using function for user:', userId);
      
      // Use the database function to get or create profile
      const { data, error } = await supabase
        .rpc('get_or_create_user_profile', { p_user_id: userId });
      
      if (error) {
        console.error('❌ Profile fetch error:', error);
        throw error;
      }
      
      const profileData = data?.[0];
      if (!profileData) {
        throw new Error('No profile data returned');
      }
      
      console.log('✅ Profile fetched:', profileData.name);
      return profileData as UserProfile;
    },
    enabled: !!userId && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) throw new Error('No user ID');
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) throw error;
    
    // Refresh the profile data
    await refetch();
    
    return true;
  };

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    // Helper getters
    displayName: profile?.name || 'Customer',
    firstName: profile?.name?.split(' ')[0] || 'there',
  };
};
