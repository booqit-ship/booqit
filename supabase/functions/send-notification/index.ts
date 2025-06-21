
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Send notification function started")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, body, data } = await req.json()

    console.log('📤 SEND NOTIFICATION: Processing request for user:', userId)
    console.log('📤 SEND NOTIFICATION: Payload:', { title, body, data })

    if (!userId || !title || !body) {
      console.error('❌ SEND NOTIFICATION: Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: userId, title, body' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmServerKey) {
      console.error('❌ SEND NOTIFICATION: FCM_SERVER_KEY not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'FCM server key not configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Create Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's FCM token from notification_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('fcm_token, notification_enabled')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings) {
      console.error('❌ SEND NOTIFICATION: No notification settings found for user:', userId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User notification settings not found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    if (!settings.notification_enabled) {
      console.log('🔕 SEND NOTIFICATION: Notifications disabled for user:', userId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Notifications disabled for user' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    if (!settings.fcm_token) {
      console.error('❌ SEND NOTIFICATION: No FCM token for user:', userId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No FCM token found for user' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Prepare FCM message
    const fcmPayload = {
      to: settings.fcm_token,
      notification: {
        title: title,
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        click_action: 'https://app.booqit.in'
      },
      data: {
        ...data,
        click_action: 'https://app.booqit.in'
      }
    }

    console.log('🚀 SEND NOTIFICATION: Sending FCM request...')

    // Send notification via FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmPayload)
    })

    const fcmResult = await fcmResponse.json()
    console.log('📱 SEND NOTIFICATION: FCM response:', fcmResult)

    // Log the notification attempt
    await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        title: title,
        body: body,
        type: data?.type || 'general',
        status: fcmResponse.ok ? 'sent' : 'failed',
        fcm_response: JSON.stringify(fcmResult),
        error_message: fcmResponse.ok ? null : fcmResult.error
      })

    if (!fcmResponse.ok) {
      console.error('❌ SEND NOTIFICATION: FCM request failed:', fcmResult)
      
      // Update failure count in notification_settings
      await supabase
        .from('notification_settings')
        .update({
          failed_notification_count: supabase.rpc('increment_failure_count', { user_id: userId }),
          last_failure_reason: fcmResult.error || 'FCM request failed'
        })
        .eq('user_id', userId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'FCM notification failed',
          fcm_error: fcmResult
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Update success timestamp and reset failure count
    await supabase
      .from('notification_settings')
      .update({
        last_notification_sent: new Date().toISOString(),
        failed_notification_count: 0,
        last_failure_reason: null
      })
      .eq('user_id', userId)

    console.log('✅ SEND NOTIFICATION: Successfully sent to user:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        fcm_response: fcmResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ SEND NOTIFICATION: Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
