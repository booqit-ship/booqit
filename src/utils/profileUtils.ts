
import { supabase } from '@/integrations/supabase/client';

export const ensureUserProfile = async (userId: string, userEmail: string, userMetadata: any = {}) => {
  try {
    console.log('🔧 Ensuring profile exists for user:', userId);
    
    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
    }
    
    if (existingProfile) {
      console.log('✅ Profile already exists');
      return existingProfile;
    }
    
    // Use RPC function to ensure profile creation
    const { data: profileData, error: rpcError } = await supabase
      .rpc('ensure_merchant_profile', { p_user_id: userId });
    
    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError);
      
      // Fallback: try direct insert
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userMetadata?.name || userEmail?.split('@')[0] || 'User',
          email: userEmail || '',
          phone: userMetadata?.phone || null,
          role: userMetadata?.role || 'customer'
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('❌ Direct insert failed:', insertError);
        return null;
      }
      
      console.log('✅ Profile created via direct insert');
      return newProfile;
    }
    
    // Get the created profile
    const { data: createdProfile, error: getError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (getError) {
      console.error('❌ Error fetching created profile:', getError);
      return null;
    }
    
    console.log('✅ Profile ensured via RPC function');
    return createdProfile;
    
  } catch (error) {
    console.error('❌ Exception in ensureUserProfile:', error);
    return null;
  }
};

export const getUserRole = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return 'customer';
    }
    
    return data?.role || 'customer';
  } catch (error) {
    console.error('Exception in getUserRole:', error);
    return 'customer';
  }
};
