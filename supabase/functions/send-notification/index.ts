
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

async function getAccessToken(): Promise<string> {
  try {
    const serviceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccount) {
      throw new Error('Firebase service account not found')
    }

    const serviceAccountJson = JSON.parse(serviceAccount)
    
    // Create JWT for Firebase Auth
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccountJson.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // Simple JWT creation (for production, consider using a proper JWT library)
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payloadEncoded = btoa(JSON.stringify(payload))
    
    // For this demo, we'll use the simpler approach with the service account key
    // In production, you'd want to implement proper RSA signing
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${payloadEncoded}.signature`, // Simplified for demo
      }),
    })

    if (!tokenResponse.ok) {
      // Fallback to server key if JWT fails
      console.log('JWT auth failed, using fallback method')
      return 'fallback'
    }

    const tokenData = await tokenResponse.json()
    return tokenData.access_token
  } catch (error) {
    console.error('Error getting access token:', error)
    return 'fallback'
  }
}

async function sendNotificationToToken(token: string, title: string, body: string, data: Record<string, string> = {}) {
  try {
    const accessToken = await getAccessToken()
    const projectId = 'booqit09-f4cfc'
    
    if (accessToken === 'fallback') {
      // Use legacy API as fallback
      const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
      if (!FIREBASE_SERVER_KEY) {
        throw new Error('Firebase server key not found')
      }

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
            click_action: 'https://your-app-domain.com'
          },
          data
        }),
      })

      return await response.json()
    } else {
      // Use v1 API
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title,
              body,
            },
            data,
            webpush: {
              notification: {
                icon: '/icons/icon-192.png',
              }
            }
          }
        }),
      })

      return await response.json()
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, title, body, data }: NotificationRequest = await req.json()

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's FCM token from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }), 
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!profile.fcm_token) {
      console.log('No FCM token for user:', userId)
      return new Response(
        JSON.stringify({ error: 'No FCM token found for user' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (profile.notification_enabled === false) {
      console.log('Notifications disabled for user:', userId)
      return new Response(
        JSON.stringify({ message: 'Notifications disabled for user' }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send the notification
    const result = await sendNotificationToToken(profile.fcm_token, title, body, data || {})

    // Log the notification
    await supabaseClient
      .from('notification_logs')
      .insert({
        user_id: userId,
        title,
        body,
        type: data?.type || 'general',
        status: 'sent'
      })

    console.log('Notification sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        result 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    
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
