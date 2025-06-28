
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idToken, userData } = await req.json();
    
    if (!idToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData?.phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Verifying Firebase token and checking phone:', userData.phone);

    // Verify Firebase ID token using the correct Google API
    const firebaseResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!firebaseResponse.ok) {
      const errorText = await firebaseResponse.text();
      console.error('❌ Firebase token verification failed:', firebaseResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Firebase token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firebaseData = await firebaseResponse.json();
    console.log('✅ Firebase token verified for user:', firebaseData.sub);

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists in profiles table by phone (using service role)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', userData.phone)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking existing profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error while checking profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let profileData;
    let isExistingUser = false;

    if (existingProfile) {
      console.log('✅ Existing user found:', existingProfile.name);
      isExistingUser = true;
      
      // Update Firebase UID if needed
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ firebase_uid: firebaseData.sub })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating existing profile:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileData = updatedProfile;
    } else {
      console.log('✅ New user, creating profile');
      
      // New user - create profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          firebase_uid: firebaseData.sub,
          name: userData.name || 'Customer',
          phone: userData.phone,
          email: userData.email || '',
          role: 'customer'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating new profile:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileData = newProfile;
    }

    // Create or get Supabase user
    let supabaseUser;
    
    try {
      // Try to create the user first
      const { data: createUserData, error: createUserError } = await supabase.auth.admin.createUser({
        user_id: profileData.id,
        phone: userData.phone,
        phone_confirmed: true,
        user_metadata: {
          name: profileData.name,
          phone: profileData.phone,
          firebase_uid: firebaseData.sub
        }
      });

      if (createUserError && !createUserError.message?.includes('already been registered')) {
        console.error('❌ Error creating Supabase user:', createUserError);
        throw createUserError;
      }

      supabaseUser = createUserData?.user;
    } catch (error) {
      console.log('🔄 User might already exist, trying to get existing user');
      
      // If creation failed, try to get existing user
      const { data: existingUser } = await supabase.auth.admin.getUserById(profileData.id);
      supabaseUser = existingUser.user;
    }

    // Generate access token
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateAccessToken(
      profileData.id
    );

    if (tokenError) {
      console.error('❌ Error generating access token:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate session token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authentication successful for:', isExistingUser ? 'existing user' : 'new user');

    return new Response(
      JSON.stringify({
        success: true,
        user: profileData,
        session: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          user: supabaseUser
        },
        isExistingUser
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in firebase-auth function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
