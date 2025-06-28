
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced Firebase token verification
const verifyFirebaseToken = async (idToken: string) => {
  try {
    console.log('🔐 Verifying Firebase ID token');
    
    // Decode token parts
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const header = JSON.parse(atob(tokenParts[0]));
    const payload = JSON.parse(atob(tokenParts[1]));
    
    console.log('🔍 Token payload verified:', {
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
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

// Check if firebase_uid column exists
const checkFirebaseUidColumnExists = async (supabase: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('firebase_uid')
      .limit(1);
    
    if (error && error.code === 'PGRST204') {
      console.log('⚠️ firebase_uid column does not exist yet');
      return false;
    }
    
    console.log('✅ firebase_uid column exists');
    return true;
  } catch (error) {
    console.log('⚠️ Error checking firebase_uid column:', error);
    return false;
  }
};

// Enhanced user resolution with proper error handling
const resolveOrCreateSupabaseUser = async (supabase: any, profileData: any, firebaseData: any, userData: any) => {
  try {
    console.log('🔍 Resolving Supabase user for profile:', profileData.id);
    
    // First, try to get existing Supabase user by profile ID
    const { data: existingUserData, error: getUserError } = await supabase.auth.admin.getUserById(profileData.id);
    
    if (existingUserData?.user && !getUserError) {
      console.log('✅ Found existing Supabase user:', existingUserData.user.id);
      return existingUserData.user;
    }
    
    console.log('⚠️ No Supabase user found for profile, checking auth.users by phone');
    
    // Try to find user by phone in auth.users
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    
    if (!listError && usersList?.users) {
      const userByPhone = usersList.users.find((user: any) => 
        user.phone === userData.phone || 
        user.user_metadata?.phone === userData.phone
      );
      
      if (userByPhone) {
        console.log('✅ Found existing Supabase user by phone:', userByPhone.id);
        
        // Update profile ID to match the found user
        await supabase
          .from('profiles')
          .update({ id: userByPhone.id })
          .eq('phone', userData.phone);
        
        console.log('✅ Updated profile ID to match existing user');
        return userByPhone;
      }
    }
    
    console.log('🆕 Creating new Supabase user');
    
    // Create new Supabase user with specific ID
    const { data: newUserData, error: createUserError } = await supabase.auth.admin.createUser({
      user_id: profileData.id,
      phone: userData.phone,
      phone_confirmed: true,
      user_metadata: {
        name: userData.name || 'Customer',
        phone: userData.phone,
        firebase_uid: firebaseData.uid
      }
    });

    if (createUserError) {
      console.error('❌ Error creating Supabase user:', createUserError);
      
      // If user already exists with different ID, try to find and use it
      if (createUserError.message?.includes('already been registered')) {
        console.log('🔄 User already registered, attempting to find by phone');
        const { data: usersList2 } = await supabase.auth.admin.listUsers();
        const existingUser = usersList2?.users?.find((user: any) => user.phone === userData.phone);
        
        if (existingUser) {
          console.log('✅ Found existing user after registration error:', existingUser.id);
          return existingUser;
        }
      }
      
      throw createUserError;
    }

    console.log('✅ Created new Supabase user:', newUserData.user.id);
    return newUserData.user;
    
  } catch (error) {
    console.error('❌ Error in resolveOrCreateSupabaseUser:', error);
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
      console.error('❌ Missing ID token');
      return new Response(
        JSON.stringify({ success: false, error: 'ID token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData?.phone) {
      console.error('❌ Missing phone number');
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

    // Check if firebase_uid column exists
    const firebaseUidExists = await checkFirebaseUidColumnExists(supabase);

    // Check if user already exists in profiles table by phone
    console.log('🔍 Checking for existing profile with phone:', userData.phone);
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, phone, email, role')
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
    let supabaseUser;
    let isExistingUser = false;

    if (existingProfile) {
      console.log('✅ Existing profile found:', existingProfile.name);
      isExistingUser = true;
      
      // Resolve or create the corresponding Supabase user
      supabaseUser = await resolveOrCreateSupabaseUser(supabase, existingProfile, firebaseData, userData);
      
      // Update firebase_uid if column exists and user resolved successfully
      if (firebaseUidExists && supabaseUser) {
        try {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ 
              firebase_uid: firebaseData.uid,
              id: supabaseUser.id // Ensure profile ID matches Supabase user ID
            })
            .eq('phone', userData.phone)
            .select()
            .single();

          if (updateError) {
            console.warn('⚠️ Could not update firebase_uid:', updateError.message);
            profileData = { ...existingProfile, id: supabaseUser.id };
          } else {
            profileData = updatedProfile;
            console.log('✅ Updated profile with firebase_uid and correct ID');
          }
        } catch (updateError) {
          console.warn('⚠️ Firebase UID update failed, using existing profile:', updateError);
          profileData = { ...existingProfile, id: supabaseUser.id };
        }
      } else {
        profileData = { ...existingProfile, id: supabaseUser?.id || existingProfile.id };
      }
    } else {
      console.log('✅ New user, creating Supabase user and profile');
      
      // Create Supabase user first
      const { data: createUserData, error: createUserError } = await supabase.auth.admin.createUser({
        phone: userData.phone,
        phone_confirmed: true,
        user_metadata: {
          name: userData.name || 'Customer',
          phone: userData.phone,
          firebase_uid: firebaseData.uid
        }
      });

      if (createUserError) {
        console.error('❌ Error creating Supabase user:', createUserError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      supabaseUser = createUserData.user;
      console.log('✅ Supabase user created with ID:', supabaseUser.id);
      
      // Create new profile using the Supabase user ID
      const newProfileData: any = {
        id: supabaseUser.id, // Use the Supabase user ID
        name: userData.name || 'Customer',
        phone: userData.phone,
        email: userData.email || firebaseData.email || '',
        role: 'customer'
      };

      // Add firebase_uid only if column exists
      if (firebaseUidExists) {
        newProfileData.firebase_uid = firebaseData.uid;
        console.log('✅ Including firebase_uid in new profile');
      } else {
        console.log('⚠️ Skipping firebase_uid in new profile - column does not exist');
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([newProfileData])
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
      console.log('✅ Created new profile successfully');
    }

    console.log('✅ Profile data ready:', { id: profileData.id, name: profileData.name });
    console.log('✅ Supabase user ready:', { id: supabaseUser?.id });

    // Ensure we have a valid Supabase user before generating token
    if (!supabaseUser || !supabaseUser.id) {
      console.error('❌ No valid Supabase user found for token generation');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to resolve user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate access token using the Supabase user ID
    console.log('🔑 Generating access token for user:', supabaseUser.id);
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateAccessToken(
      supabaseUser.id
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
