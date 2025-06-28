
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
      
      console.log('🔍 Fetching profile for user:', userId);
      
      // First try to get existing profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (existingProfile && !profileError) {
        console.log('✅ Profile found:', existingProfile.name);
        return existingProfile as UserProfile;
      }
      
      console.log('🔧 Profile not found, creating new profile...');
      
      // Get user data from auth.users to create profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Create new profile
      const newProfile = {
        id: userId,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || 'customer',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Profile creation error:', createError);
        throw createError;
      }
      
      console.log('✅ Profile created:', createdProfile.name);
      return createdProfile as UserProfile;
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
