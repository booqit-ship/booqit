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

    // Verify Firebase ID token
    const firebaseResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`
    );
    
    if (!firebaseResponse.ok) {
      console.error('Firebase token verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Firebase token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firebaseData = await firebaseResponse.json();
    console.log('Firebase token verified for user:', firebaseData.sub);

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists in profiles table by phone
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', userData.phone)
      .single();

    let profileData;

    if (existingProfile) {
      // Existing user - update Firebase UID if needed
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ firebase_uid: firebaseData.sub })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing profile:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileData = updatedProfile;
    } else {
      // New user - create profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          firebase_uid: firebaseData.sub,
          name: userData.name,
          phone: userData.phone,
          email: userData.email || '',
          role: 'customer'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating new profile:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      profileData = newProfile;
    }

    // Generate Supabase JWT token
    const { data: { user }, error: signInError } = await supabase.auth.admin.createUser({
      user_id: profileData.id,
      phone: userData.phone,
      user_metadata: {
        name: profileData.name,
        phone: profileData.phone,
        firebase_uid: firebaseData.sub
      }
    });

    if (signInError && !signInError.message.includes('already been registered')) {
      console.error('Error creating Supabase user:', signInError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create Supabase session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate access token for the user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateAccessToken(
      profileData.id
    );

    if (tokenError) {
      console.error('Error generating access token:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate session token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: profileData,
        session: tokenData,
        isExistingUser: !!existingProfile
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in firebase-auth function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
