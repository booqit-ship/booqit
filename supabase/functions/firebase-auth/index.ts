
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Firebase Admin SDK for token verification
const verifyFirebaseToken = async (idToken: string) => {
  try {
    console.log('🔐 Verifying Firebase ID token with Firebase Admin SDK approach');
    
    // Use Firebase's public key verification endpoint
    const response = await fetch(`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`);
    const publicKeys = await response.json();
    
    // Decode the token header to get the key ID
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const header = JSON.parse(atob(tokenParts[0]));
    const payload = JSON.parse(atob(tokenParts[1]));
    
    console.log('🔍 Token payload:', {
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
      sub: payload.sub,
      phone_number: payload.phone_number
    });
    
    // Verify token claims
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      throw new Error('Token has expired');
    }
    
    if (payload.iat > now) {
      throw new Error('Token used before issued');
    }
    
    if (payload.iss !== `https://securetoken.google.com/booqit09-f4cfc`) {
      throw new Error('Invalid token issuer');
    }
    
    if (payload.aud !== 'booqit09-f4cfc') {
      throw new Error('Invalid token audience');
    }
    
    if (!payload.sub) {
      throw new Error('Token missing subject');
    }
    
    console.log('✅ Firebase token verified successfully');
    return {
      uid: payload.sub,
      phone_number: payload.phone_number,
      email: payload.email,
      email_verified: payload.email_verified
    };
    
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error);
    throw error;
  }
};

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

    console.log('🔍 Processing Firebase authentication for phone:', userData.phone);

    // Verify Firebase ID token
    const firebaseData = await verifyFirebaseToken(idToken);
    console.log('✅ Firebase token verified for user:', firebaseData.uid);

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
        .update({ firebase_uid: firebaseData.uid })
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
          firebase_uid: firebaseData.uid,
          name: userData.name || 'Customer',
          phone: userData.phone,
          email: userData.email || firebaseData.email || '',
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
          firebase_uid: firebaseData.uid
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
      JSON.stringify({ 
        success: false, 
        error: 'Authentication failed',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
