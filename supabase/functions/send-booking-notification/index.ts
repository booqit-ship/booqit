
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendOneSignalNotification = async (title: string, message: string, externalUserId: string) => {
  try {
    console.log('📧 Sending OneSignal notification...');
    console.log('📧 Target user ID:', externalUserId);
    console.log('📧 Title:', title);
    console.log('📧 Message:', message);
    
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
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
        // Enhanced notification settings for better delivery
        large_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        small_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        android_sound: 'default',
        ios_sound: 'default',
        android_vibration_pattern: [1000, 1000, 1000],
        priority: 10,
        android_visibility: 1,
        chrome_web_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        firefox_icon: 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com/favicon.ico',
        send_after: new Date().toISOString(),
        delayed_option: 'immediate'
      })
    });

    const result = await oneSignalResponse.json();
    console.log('✅ OneSignal API response:', JSON.stringify(result, null, 2));
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ OneSignal API errors:', result.errors);
      throw new Error('OneSignal API returned errors: ' + JSON.stringify(result.errors));
    }
    
    // Check if notification was sent to any recipients
    if (result.recipients && result.recipients === 0) {
      console.warn('⚠️ No recipients received the notification. User may not be subscribed.');
      return {
        ...result,
        warning: 'No recipients found - user may not be subscribed to notifications'
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    throw error;
  }
};

Deno.serve(async (req) => {
  console.log('🚀 Edge Function started at:', new Date().toISOString());
  console.log('🚀 Method:', req.method);
  console.log('🚀 URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Processing notification request...');
    
    const requestBody = await req.json();
    console.log('📥 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { bookingId, merchantUserId, customerName, serviceName, dateTime, staffName, automated } = requestBody;

    // Validate required parameters
    const missingParams = [];
    if (!bookingId) missingParams.push('bookingId');
    if (!merchantUserId) missingParams.push('merchantUserId');
    if (!customerName) missingParams.push('customerName');
    if (!serviceName) missingParams.push('serviceName');
    if (!dateTime) missingParams.push('dateTime');

    if (missingParams.length > 0) {
      const errorMessage = `Missing required parameters: ${missingParams.join(', ')}`;
      console.error('❌ Validation error:', errorMessage);
      console.error('❌ Received params:', Object.keys(requestBody));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          received_params: Object.keys(requestBody)
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Create notification message with staff info
    const staffInfo = staffName ? ` with ${staffName}` : '';
    const title = '🎉 New Booking Alert!';
    const message = `${customerName} just booked ${serviceName}${staffInfo} for ${dateTime}. Check your calendar now!`;

    console.log('📤 Sending notification to merchant:', merchantUserId);
    console.log('📤 Notification details:', { title, message, staffInfo });

    // Send the notification
    const notificationResult = await sendOneSignalNotification(title, message, merchantUserId);

    console.log('✅ Notification sent successfully');
    console.log('✅ OneSignal result:', notificationResult);

    // Return success response with detailed information
    const response = {
      success: true,
      message: 'Booking notification sent successfully',
      details: {
        bookingId,
        merchantUserId,
        title,
        message,
        staffName,
        oneSignalResult: notificationResult,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Returning success response:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-booking-notification function:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
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
