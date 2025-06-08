
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendOneSignalNotification = async (title: string, message: string, externalUserId: string) => {
  try {
    console.log('📧 Sending OneSignal notification to:', externalUserId);
    
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
          timestamp: new Date().toISOString(),
          externalUserId: externalUserId
        },
        web_buttons: [
          {
            id: 'view_booking',
            text: 'View Calendar',
            url: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/calendar'
          }
        ],
        // Add notification customization
        large_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        small_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        // Sound and vibration settings
        android_sound: 'default',
        ios_sound: 'default',
        android_vibration_pattern: [1000, 1000, 1000],
        // Priority settings
        priority: 10,
        android_visibility: 1
      })
    });

    const result = await response.json();
    console.log('✅ OneSignal notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    throw error;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, merchantUserId, customerName, serviceName, dateTime, staffName, automated } = await req.json();

    console.log('📥 Received booking notification request:', {
      bookingId,
      merchantUserId,
      customerName,
      serviceName,
      dateTime,
      staffName,
      automated
    });

    if (!bookingId || !merchantUserId || !customerName || !serviceName || !dateTime) {
      throw new Error('Missing required parameters');
    }

    // Create a more engaging notification message
    const staffInfo = staffName ? ` for ${staffName}` : '';
    const title = '🎉 New Booking Alert!';
    const message = `Hey! ${customerName} just booked ${serviceName}${staffInfo} for ${dateTime}. Check it out on your calendar!`;

    console.log('📤 Sending notification:', { title, message, merchantUserId });

    await sendOneSignalNotification(title, message, merchantUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking notification sent successfully',
        details: {
          bookingId,
          merchantUserId,
          title,
          message,
          staffName
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-booking-notification:', error);
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
