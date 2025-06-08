
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')

interface NotificationRequest {
  token: string
  notification: {
    title: string
    body: string
  }
  data?: Record<string, string>
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { token, notification, data }: NotificationRequest = await req.json()

    if (!token || !notification) {
      return new Response('Missing required fields', { status: 400 })
    }

    if (!FIREBASE_SERVER_KEY) {
      return new Response('Firebase server key not configured', { status: 500 })
    }

    const payload = {
      to: token,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/icons/icon-192.png',
        click_action: 'https://your-app-domain.com'
      },
      data: data || {}
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('FCM Error:', result)
      return new Response(JSON.stringify({ error: 'Failed to send notification', details: result }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
