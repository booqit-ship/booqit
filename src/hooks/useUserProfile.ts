
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  fcm_token: string | null;
  notification_enabled: boolean | null;
  last_notification_sent: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID available');
      
      console.log('🔍 Fetching user profile for:', user.id);
      
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile && !fetchError) {
        console.log('✅ Profile found:', existingProfile.name);
        return existingProfile as UserProfile;
      }

      // If profile doesn't exist, create it
      console.log('📝 Creating new profile for user');
      const { data: newProfile, error: createError } = await supabase
        .rpc('get_or_create_user_profile', { p_user_id: user.id });

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        throw new Error(`Failed to create profile: ${createError.message}`);
      }

      if (newProfile && newProfile.length > 0) {
        console.log('✅ Profile created successfully');
        return newProfile[0] as UserProfile;
      }

      throw new Error('Failed to fetch or create user profile');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) throw new Error('No user ID available');
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Refetch profile after update
    refetch();
    return data;
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch
  };
};
