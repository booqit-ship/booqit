
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendOneSignalNotification = async (title: string, message: string, externalUserId: string) => {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic os_v2_app_2wqgcswu7rc2baouz73wfm3w3xr45htu3jyusmn2uykghbhumpxb6osm76nvpi2rdtc5xtpfhwdkekikcg52e5qrlapmqbsm3dylvha',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: 'd5a0614a-d4fc-45a0-81d4-cff762b376dd',
        include_external_user_ids: [externalUserId],
        headings: { en: title },
        contents: { en: message },
        data: {
          type: 'new_booking',
          timestamp: new Date().toISOString()
        }
      })
    });

    const result = await response.json();
    console.log('OneSignal notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    throw error;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, merchantUserId, customerName, serviceName, dateTime } = await req.json();

    if (!bookingId || !merchantUserId || !customerName || !serviceName || !dateTime) {
      throw new Error('Missing required parameters');
    }

    const title = '🎉 New Booking Received!';
    const message = `${customerName} has booked ${serviceName} for ${dateTime}. Check your calendar for details.`;

    await sendOneSignalNotification(title, message, merchantUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking notification sent successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in send-booking-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
