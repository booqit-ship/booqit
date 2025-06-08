
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔔 Starting daily reminders job...');

    // Get current IST time
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hour = istTime.getHours();

    console.log('⏰ Current IST hour:', hour);
    console.log('🔔 TESTING MODE: Quiet hours disabled - sending notifications 24/7');

    // Send customer reminders (TESTING: All hours enabled)
    console.log('📱 Sending customer reminders...');
    
    // Get customers who haven't received a notification today and haven't booked recently
    const { data: customers, error: customerError } = await supabaseClient
      .from('profiles')
      .select('id, name, last_notification_sent')
      .eq('role', 'customer')
      .eq('notification_enabled', true)
      .not('fcm_token', 'is', null);

    if (customerError) {
      console.error('❌ Error fetching customers:', customerError);
    } else {
      const today = new Date().toDateString();
      
      for (const customer of customers || []) {
        const lastSent = customer.last_notification_sent ? new Date(customer.last_notification_sent) : null;
        
        // Skip if already sent today
        if (lastSent && lastSent.toDateString() === today) {
          continue;
        }

        // Check if customer hasn't booked in the last 7 days
        const { data: recentBookings } = await supabaseClient
          .from('bookings')
          .select('id')
          .eq('user_id', customer.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentBookings || recentBookings.length === 0) {
          // Send reminder
          const messages = [
            {
              title: "Self-care check-in 🧖",
              body: "Book your next beauty session now — slots are filling fast!"
            },
            {
              title: "Your favorite salon is waiting 💅",
              body: "Treat yourself today, you deserve it."
            },
            {
              title: "Ready for a glow-up? ✨",
              body: "Tap to explore the best salons around you."
            }
          ];

          const randomIndex = Math.floor(Math.random() * messages.length);
          const message = messages[randomIndex];

          try {
            await supabaseClient.functions.invoke('send-notification', {
              body: {
                userId: customer.id,
                title: message.title,
                body: message.body,
                data: {
                  type: 'daily_reminder',
                  userRole: 'customer',
                  timestamp: new Date().toISOString()
                }
              }
            });

            // Update last notification sent
            await supabaseClient
              .from('profiles')
              .update({ last_notification_sent: new Date().toISOString() })
              .eq('id', customer.id);

            console.log('✅ Customer reminder sent to:', customer.name);
          } catch (error) {
            console.error('❌ Error sending customer reminder:', error);
          }
        }
      }
    }

    // Send merchant reminders (TESTING: All hours enabled)
    console.log('🏪 Sending merchant reminders...');
    
    // Get merchants who haven't received a notification today
    const { data: merchants, error: merchantError } = await supabaseClient
      .from('profiles')
      .select('id, name, last_notification_sent')
      .eq('role', 'merchant')
      .eq('notification_enabled', true)
      .not('fcm_token', 'is', null);

    if (merchantError) {
      console.error('❌ Error fetching merchants:', merchantError);
    } else {
      const today = new Date().toDateString();
      
      for (const merchant of merchants || []) {
        const lastSent = merchant.last_notification_sent ? new Date(merchant.last_notification_sent) : null;
        
        // Skip if already sent today
        if (lastSent && lastSent.toDateString() === today) {
          continue;
        }

        const firstName = merchant.name?.split(' ')[0] || 'there';
        const messages = [
          {
            title: `Good morning, ${firstName}! ☀️`,
            body: "Let's make today beautiful — check your bookings and shine 💇‍♂️✨"
          },
          {
            title: "You're one booking away from someone's transformation 💖",
            body: "Keep up the great work!"
          },
          {
            title: "Another day, another glow-up to deliver! 💪",
            body: "Open your calendar to see who's waiting for you."
          }
        ];

        const randomIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randomIndex];

        try {
          await supabaseClient.functions.invoke('send-notification', {
            body: {
              userId: merchant.id,
              title: message.title,
              body: message.body,
              data: {
                type: 'daily_reminder',
                userRole: 'merchant',
                timestamp: new Date().toISOString()
              }
            }
          });

          // Update last notification sent
          await supabaseClient
            .from('profiles')
            .update({ last_notification_sent: new Date().toISOString() })
            .eq('id', merchant.id);

          console.log('✅ Merchant reminder sent to:', merchant.name);
        } catch (error) {
          console.error('❌ Error sending merchant reminder:', error);
        }
      }
    }

    console.log('✅ Daily reminders job completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily reminders processed successfully (TESTING MODE: 24/7)',
        hour: hour,
        testingMode: true
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in daily reminders:', error)
    
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
