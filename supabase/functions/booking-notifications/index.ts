
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, record } = await req.json();

    console.log('Processing booking notification:', type, record);

    // Handle different notification types
    switch (type) {
      case 'new_booking':
        // Notify merchant of new booking
        const { data: merchantData } = await supabaseClient
          .from('merchants')
          .select('user_id, shop_name')
          .eq('id', record.merchant_id)
          .single();

        if (merchantData) {
          await supabaseClient.functions.invoke('send-notification', {
            body: {
              userId: merchantData.user_id,
              title: 'New Booking! 📅',
              body: `${record.customer_name} has booked ${record.service_name} for ${record.date} at ${record.time_slot}`,
              data: {
                type: 'new_booking',
                bookingId: record.id
              }
            }
          });

          // Also notify customer that booking is confirmed
          await supabaseClient.functions.invoke('send-notification', {
            body: {
              userId: record.user_id,
              title: '🎉 Booking Confirmed!',
              body: `Your appointment at ${merchantData.shop_name} for ${record.service_name} on ${record.date} at ${record.time_slot} is confirmed!`,
              data: {
                type: 'booking_confirmed',
                bookingId: record.id
              }
            }
          });
        }
        break;

      default:
        console.log('Unknown notification type:', type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
