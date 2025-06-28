
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { isAuthenticated, userId } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the database function to get or create profile
      const { data, error } = await supabase.rpc('get_or_create_user_profile', {
        p_user_id: userId
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
      } else {
        throw new Error('Failed to get or create profile');
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userId]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId || !profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      return false;
    }
  }, [userId, profile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const firstName = profile?.name?.split(' ')[0] || '';
  const fullName = profile?.name || '';

  return {
    profile,
    isLoading,
    error,
    firstName,
    fullName,
    updateProfile,
    refetch: fetchProfile
  };
};
