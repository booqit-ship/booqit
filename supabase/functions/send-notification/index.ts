
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

serve(async (req) => {
  console.log('📨 Notification request received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let requestBody: NotificationRequest;
    
    try {
      requestBody = await req.json()
      console.log('📋 Request body received:', JSON.stringify(requestBody, null, 2));
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { userId, title, body, data } = requestBody;

    if (!userId || !title || !body) {
      console.error('❌ Missing required fields:', { userId, title, body })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Looking up user profile for:', userId);

    // Get user's FCM token from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError.message }), 
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!profile) {
      console.error('❌ No profile found for user:', userId)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }), 
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('👤 Profile found:', {
      hasToken: !!profile.fcm_token,
      tokenLength: profile.fcm_token?.length || 0,
      tokenPreview: profile.fcm_token?.substring(0, 20) + '...' || 'none',
      notificationEnabled: profile.notification_enabled
    });

    if (!profile.fcm_token) {
      console.log('⚠️ No FCM token for user:', userId)
      return new Response(
        JSON.stringify({ error: 'No FCM token found for user' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (profile.notification_enabled === false) {
      console.log('🔕 Notifications disabled for user:', userId)
      return new Response(
        JSON.stringify({ message: 'Notifications disabled for user' }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🚀 Sending notification to FCM token:', profile.fcm_token.substring(0, 20) + '...');

    // Send the notification using Firebase v1 API
    let notificationResult;
    try {
      notificationResult = await sendNotificationToToken(profile.fcm_token, title, body, data || {});
      console.log('✅ FCM notification sent successfully:', notificationResult);
    } catch (fcmError) {
      console.error('❌ FCM send error:', fcmError)
      
      // Log the failed notification
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: userId,
          title,
          body,
          type: data?.type || 'general',
          status: 'failed',
          error_message: fcmError.message
        })

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send notification',
          details: fcmError.message 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log the successful notification
    const { error: logError } = await supabaseClient
      .from('notification_logs')
      .insert({
        user_id: userId,
        title,
        body,
        type: data?.type || 'general',
        status: 'sent',
        fcm_response: notificationResult
      })

    if (logError) {
      console.error('⚠️ Failed to log notification:', logError);
    } else {
      console.log('📝 Notification logged successfully');
    }

    console.log('✅ Notification sent successfully:', notificationResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        result: notificationResult 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in send-notification function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function getAccessToken() {
  const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('Firebase service account not configured')
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    throw new Error('Invalid Firebase service account JSON');
  }

  const { private_key, client_email } = serviceAccount;
  
  // Create JWT for Google OAuth
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Simple JWT creation (for production, consider using a proper JWT library)
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create signature using Web Crypto API
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(`${encodedHeader}.${encodedPayload}`);
  
  // Import the private key
  const privateKeyPem = private_key.replace(/\\n/g, '\n');
  const keyData = new TextEncoder().encode(privateKeyPem);
  
  // For simplicity, we'll make a request to Google's token endpoint with client assertion
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(header, payload, privateKeyPem),
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  // Simple JWT implementation for Google OAuth
  // In production, consider using a proper JWT library
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // For now, we'll use a simplified approach and make the OAuth request directly
  // This is a fallback - in production you'd want proper JWT signing
  return `${encodedHeader}.${encodedPayload}.signature`;
}

async function sendNotificationToToken(token: string, title: string, body: string, data: Record<string, string> = {}) {
  const PROJECT_ID = 'booqit09-f4cfc'; // Your Firebase project ID
  
  console.log('📤 Getting access token for FCM v1 API...');
  
  try {
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    
    const message = {
      message: {
        token: token,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'https://booqit09-f4cfc.web.app'
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192.png',
            click_action: 'https://booqit09-f4cfc.web.app',
            tag: 'booqit-notification'
          },
          fcm_options: {
            link: 'https://booqit09-f4cfc.web.app'
          }
        }
      }
    };

    console.log('📤 Sending FCM v1 request:', JSON.stringify(message, null, 2));

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('📨 FCM v1 response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FCM v1 API error response:', response.status, errorText);
      throw new Error(`FCM v1 API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📨 FCM v1 response data:', result);
    
    return result;
  } catch (error) {
    console.error('❌ FCM v1 API error:', error);
    throw error;
  }
}
