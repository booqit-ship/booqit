
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Booking {
  id: string;
  user_id: string;
  customer_name: string;
  date: string;
  time_slot: string;
  status: string;
  service: {
    name: string;
  };
  merchant: {
    shop_name: string;
  };
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
        ios_badgeType: 'Increase',
        ios_badgeCount: 1
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

const calculateTimeUntilAppointment = (appointmentDate: string, appointmentTime: string): number => {
  const now = new Date();
  
  // Convert IST appointment to UTC for comparison
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}:00+05:30`);
  
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const minutesUntil = Math.floor(timeDifference / (1000 * 60));
  
  return minutesUntil;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔔 Starting reminder check at:', new Date().toISOString());

    // Get all confirmed bookings for today and tomorrow
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: bookings, error } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        customer_name,
        date,
        time_slot,
        status,
        services:service_id (name),
        merchants:merchant_id (shop_name)
      `)
      .eq('status', 'confirmed')
      .in('date', [today, tomorrow]);

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    console.log(`📅 Found ${bookings?.length || 0} confirmed bookings to check`);

    let remindersProcessed = 0;

    for (const booking of bookings || []) {
      const minutesUntil = calculateTimeUntilAppointment(booking.date, booking.time_slot);
      
      console.log(`⏰ Booking ${booking.id}: ${minutesUntil} minutes until appointment`);

      // Send reminders at 60min, 30min, and 5min before appointment
      const reminderTimes = [60, 30, 5];
      
      for (const reminderTime of reminderTimes) {
        // Allow 1-minute window for each reminder (e.g., 59-61 minutes, 29-31 minutes, 4-6 minutes)
        if (Math.abs(minutesUntil - reminderTime) <= 1) {
          const serviceName = booking.services?.name || 'Service';
          const shopName = booking.merchants?.shop_name || 'Salon';
          
          let title = '';
          let message = '';
          
          if (reminderTime === 60) {
            title = '⏰ Appointment Reminder - 1 Hour';
            message = `Hi ${booking.customer_name}! Your ${serviceName} appointment at ${shopName} is in 1 hour.`;
          } else if (reminderTime === 30) {
            title = '⏰ Appointment Reminder - 30 Minutes';
            message = `Hi ${booking.customer_name}! Your ${serviceName} appointment at ${shopName} is in 30 minutes. Please start preparing to leave.`;
          } else if (reminderTime === 5) {
            title = '🚀 Appointment Starting Soon!';
            message = `Hi ${booking.customer_name}! Your ${serviceName} appointment at ${shopName} starts in 5 minutes. Please arrive now!`;
          }

          try {
            await sendOneSignalNotification(title, message, booking.user_id);
            remindersProcessed++;
            console.log(`✅ Sent ${reminderTime}min reminder for booking ${booking.id}`);
          } catch (error) {
            console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error);
          }
          
          break; // Only send one reminder per booking per check
        }
      }
    }

    console.log(`🎯 Processed ${remindersProcessed} reminder notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${remindersProcessed} reminders`,
        bookingsChecked: bookings?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-reminders function:', error);
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
