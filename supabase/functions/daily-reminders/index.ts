
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔁 Daily reminders function triggered');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if it's during quiet hours (10 PM to 8 AM IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getHours();
    
    if (hour >= 22 || hour < 8) {
      console.log('🔕 Skipping daily reminders during quiet hours (IST)');
      return new Response(
        JSON.stringify({ message: 'Skipped during quiet hours' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Fetching users for daily reminders...');

    // Get all users with notifications enabled
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, name, role, fcm_token, notification_enabled')
      .eq('notification_enabled', true)
      .not('fcm_token', 'is', null);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log('📭 No users found for daily reminders');
      return new Response(
        JSON.stringify({ message: 'No users found' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    const today = istTime.toISOString().split('T')[0];

    for (const profile of profiles) {
      try {
        // Check if we already sent a daily reminder today
        const { data: existingLog } = await supabaseClient
          .from('notification_logs')
          .select('id')
          .eq('user_id', profile.id)
          .like('type', 'daily_reminder_%')
          .gte('sent_at', `${today}T00:00:00.000Z`)
          .single();

        if (existingLog) {
          console.log(`✅ Daily reminder already sent today to ${profile.name}`);
          skippedCount++;
          continue;
        }

        const firstName = profile.name.split(' ')[0];
        let title, body, type;

        if (profile.role === 'customer') {
          const reminderMessages = [
            `Self-care check-in, ${firstName}! 🧖\nBook your next beauty session now — slots are filling fast!`,
            `Your favorite salon is waiting, ${firstName}! 💅\nTreat yourself today, you deserve it.`,
            `Ready for a glow-up, ${firstName}? ✨\nTap to explore the best salons around you.`,
            `Time for some me-time, ${firstName}! 💆‍♀️\nYour next transformation is just a booking away.`
          ];
          
          const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
          title = 'Beauty Call! 📞✨';
          body = reminderMessages[dayOfYear % reminderMessages.length];
          type = 'daily_reminder_customer';
        } else if (profile.role === 'merchant') {
          const motivationMessages = [
            `Good morning, ${firstName}! ☀️\nLet's make today beautiful — check your bookings and shine 💇‍♂️✨`,
            `You're one booking away from someone's transformation, ${firstName}! 💖\nKeep up the great work!`,
            `Another day, another glow-up to deliver, ${firstName}! 💪\nOpen your calendar to see who's waiting for you.`,
            `Rise and shine, ${firstName}! 🌅\nYour talent is about to make someone's day brighter ✨`
          ];
          
          const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
          title = 'Good Morning, Beauty Pro! 🌟';
          body = motivationMessages[dayOfYear % motivationMessages.length];
          type = 'daily_reminder_merchant';
        } else {
          continue; // Skip unknown roles
        }

        // Send notification via our existing send-notification function
        const { error: sendError } = await supabaseClient.functions.invoke('send-notification', {
          body: {
            userId: profile.id,
            title,
            body,
            data: {
              type,
              userId: profile.id,
              timestamp: new Date().toISOString()
            }
          }
        });

        if (sendError) {
          console.error(`❌ Error sending daily reminder to ${profile.name}:`, sendError);
          continue;
        }

        console.log(`✅ Daily reminder sent to ${profile.name} (${profile.role})`);
        sentCount++;

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (profileError) {
        console.error(`❌ Error processing daily reminder for ${profile.name}:`, profileError);
        continue;
      }
    }

    console.log(`✅ Daily reminders batch completed: ${sentCount} sent, ${skippedCount} skipped`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Daily reminders sent: ${sentCount}, skipped: ${skippedCount}`,
        sent: sentCount,
        skipped: skippedCount
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error in daily-reminders function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
