
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

    // Try to send the notification using the legacy FCM API
    let notificationResult;
    try {
      notificationResult = await sendNotificationToToken(profile.fcm_token, title, body, data || {});
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
          status: 'failed'
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
    await supabaseClient
      .from('notification_logs')
      .insert({
        user_id: userId,
        title,
        body,
        type: data?.type || 'general',
        status: 'sent'
      })

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

async function sendNotificationToToken(token: string, title: string, body: string, data: Record<string, string> = {}) {
  const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
  
  if (!FIREBASE_SERVER_KEY) {
    throw new Error('Firebase server key not configured')
  }

  console.log('📤 Sending FCM request with legacy API...');
  
  // Using the legacy FCM API which is more reliable for server keys
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
        icon: '/icons/icon-192.png',
        click_action: 'https://booqit09-f4cfc.web.app'
      },
      data: {
        ...data,
        click_action: 'https://booqit09-f4cfc.web.app'
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ FCM API error response:', response.status, errorText);
    throw new Error(`FCM API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('📨 FCM response:', result);
  
  if (result.failure === 1) {
    const errors = result.results?.map(r => r.error).join(', ') || 'Unknown error';
    console.error('❌ FCM delivery failed:', result);
    throw new Error(`FCM delivery failed: ${errors}`);
  }
  
  return result;
}
