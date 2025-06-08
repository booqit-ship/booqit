
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendOneSignalNotification = async (title: string, message: string, externalUserId: string) => {
  try {
    console.log('📧 Sending OneSignal notification to user:', externalUserId);
    console.log('📧 Title:', title);
    console.log('📧 Message:', message);
    
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
        // Enhanced notification settings
        large_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        small_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        android_sound: 'default',
        ios_sound: 'default',
        android_vibration_pattern: [1000, 1000, 1000],
        priority: 10,
        android_visibility: 1,
        // Ensure delivery to web browsers
        web_push_topic: 'new_booking',
        chrome_web_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        firefox_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico'
      })
    });

    const result = await response.json();
    console.log('✅ OneSignal API response:', JSON.stringify(result, null, 2));
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ OneSignal API errors:', result.errors);
      throw new Error('OneSignal API returned errors: ' + JSON.stringify(result.errors));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    throw error;
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Validate required parameters
    if (!bookingId || !merchantUserId || !customerName || !serviceName || !dateTime) {
      const errorMessage = 'Missing required parameters. Required: bookingId, merchantUserId, customerName, serviceName, dateTime';
      console.error('❌ Validation error:', errorMessage);
      throw new Error(errorMessage);
    }

    // Create an engaging notification message with stylist name
    const staffInfo = staffName ? ` for ${staffName}` : '';
    const title = '🎉 New Booking Alert!';
    const message = `Hey! ${customerName} just booked ${serviceName}${staffInfo} for ${dateTime}. Check it out now!`;

    console.log('📤 Sending notification to merchant:', merchantUserId);
    console.log('📤 Notification content:', { title, message });

    // Send the notification
    const notificationResult = await sendOneSignalNotification(title, message, merchantUserId);

    console.log('✅ Notification sent successfully:', notificationResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking notification sent successfully',
        details: {
          bookingId,
          merchantUserId,
          title,
          message,
          staffName,
          oneSignalResult: notificationResult
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
    console.error('❌ Error in send-booking-notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
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
