
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

    console.log('📋 Processing booking notification:', type, record);

    // Enhanced notification sender with multi-device support
    const sendNotificationToAllDevices = async (userId: string, title: string, body: string, data: any) => {
      try {
        console.log(`📤 Sending notification to user ${userId}: ${title}`);
        
        // Get all active device tokens for the user
        const { data: tokens, error: tokensError } = await supabaseClient
          .from('device_tokens')
          .select('fcm_token, device_type, device_name')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (tokensError) {
          console.error('❌ Error fetching device tokens:', tokensError);
          return false;
        }

        if (!tokens || tokens.length === 0) {
          console.log('⚠️ No active device tokens found for user:', userId);
          return false;
        }

        console.log(`📱 Found ${tokens.length} devices for user ${userId}`);

        let successCount = 0;
        const invalidTokens: string[] = [];

        // Send to all devices
        for (const device of tokens) {
          try {
            const { data: response, error: sendError } = await supabaseClient.functions.invoke('send-notification', {
              body: {
                userId,
                title,
                body,
                data,
                fcm_token: device.fcm_token
              }
            });

            if (!sendError && response?.success) {
              successCount++;
              console.log(`✅ Sent to ${device.device_type} device: ${device.device_name}`);
            } else {
              console.error(`❌ Failed to send to ${device.device_type}:`, sendError || response?.error);
              
              if (sendError?.message?.includes('UNREGISTERED') || 
                  sendError?.message?.includes('invalid') ||
                  response?.error?.includes('UNREGISTERED') ||
                  response?.error?.includes('invalid')) {
                invalidTokens.push(device.fcm_token);
              }
            }
          } catch (deviceError) {
            console.error(`❌ Error sending to ${device.device_type}:`, deviceError);
            
            if (deviceError?.message?.includes('UNREGISTERED') || 
                deviceError?.message?.includes('invalid')) {
              invalidTokens.push(device.fcm_token);
            }
          }
        }

        // Clean up invalid tokens
        if (invalidTokens.length > 0) {
          console.log(`🧹 Cleaning up ${invalidTokens.length} invalid tokens`);
          await supabaseClient
            .from('device_tokens')
            .update({ is_active: false })
            .in('fcm_token', invalidTokens);
        }

        console.log(`📊 Notification sent to ${successCount}/${tokens.length} devices for user ${userId}`);
        return successCount > 0;
      } catch (error) {
        console.error('❌ Error in sendNotificationToAllDevices:', error);
        return false;
      }
    };

    // Handle different notification types
    switch (type) {
      case 'new_booking':
        console.log('🎯 Processing new booking notification');
        
        // Get merchant details and correct customer name
        const { data: merchantData, error: merchantError } = await supabaseClient
          .from('merchants')
          .select(`
            user_id, 
            shop_name,
            profiles!inner(name, email)
          `)
          .eq('id', record.merchant_id)
          .single();

        if (merchantError) {
          console.error('❌ Error fetching merchant data:', merchantError);
          break;
        }

        // Get service details
        const { data: serviceData, error: serviceError } = await supabaseClient
          .from('services')
          .select('name, duration')
          .eq('id', record.service_id)
          .single();

        if (serviceError) {
          console.error('❌ Error fetching service data:', serviceError);
          break;
        }

        // Get correct customer name - prioritize booking record fields
        let customerName = record.customer_name || 'Customer';
        
        // If booking has user_id, get name from profiles
        if (record.user_id && (!record.customer_name || record.customer_name.trim() === '')) {
          const { data: customerProfile } = await supabaseClient
            .from('profiles')
            .select('name')
            .eq('id', record.user_id)
            .single();
          
          if (customerProfile?.name) {
            customerName = customerProfile.name;
          }
        }

        console.log(`👤 Customer name resolved: ${customerName}`);

        // Format date and time consistently
        const bookingDate = new Date(record.date + 'T' + record.time_slot);
        const formattedDateTime = bookingDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' at ' + bookingDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        if (merchantData) {
          // Notify merchant of new booking
          await sendNotificationToAllDevices(
            merchantData.user_id,
            '📅 New Booking!',
            `${customerName} has booked ${serviceData?.name || 'a service'} for ${formattedDateTime}`,
            {
              type: 'new_booking',
              bookingId: record.id,
              customerName,
              serviceName: serviceData?.name || 'Service',
              dateTime: formattedDateTime
            }
          );

          // Also notify customer that booking is confirmed (only for authenticated users)
          if (record.user_id) {
            await sendNotificationToAllDevices(
              record.user_id,
              '🎉 Booking Confirmed!',
              `Your appointment at ${merchantData.shop_name} for ${serviceData?.name || 'service'} on ${formattedDateTime} is confirmed!`,
              {
                type: 'booking_confirmed',
                bookingId: record.id,
                shopName: merchantData.shop_name,
                serviceName: serviceData?.name || 'Service',
                dateTime: formattedDateTime
              }
            );
          }
        }
        break;

      case 'booking_cancelled':
        console.log('🎯 Processing booking cancellation notification');
        
        // Get booking details for cancellation
        const { data: cancelBookingData, error: cancelError } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            merchants!inner(user_id, shop_name),
            services!inner(name)
          `)
          .eq('id', record.id)
          .single();

        if (cancelError || !cancelBookingData) {
          console.error('❌ Error fetching cancellation data:', cancelError);
          break;
        }

        const cancelDateTime = new Date(cancelBookingData.date + 'T' + cancelBookingData.time_slot);
        const cancelFormattedDateTime = cancelDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' at ' + cancelDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Notify merchant of cancellation
        await sendNotificationToAllDevices(
          cancelBookingData.merchants.user_id,
          '❌ Booking Cancelled',
          `${cancelBookingData.customer_name || 'A customer'} has cancelled their ${cancelBookingData.services.name} appointment for ${cancelFormattedDateTime}`,
          {
            type: 'booking_cancelled',
            bookingId: record.id,
            customerName: cancelBookingData.customer_name,
            serviceName: cancelBookingData.services.name,
            dateTime: cancelFormattedDateTime
          }
        );

        // Notify customer of cancellation (only for authenticated users)
        if (cancelBookingData.user_id) {
          await sendNotificationToAllDevices(
            cancelBookingData.user_id,
            '❌ Booking Cancelled',
            `Your ${cancelBookingData.services.name} appointment at ${cancelBookingData.merchants.shop_name} for ${cancelFormattedDateTime} has been cancelled.`,
            {
              type: 'booking_cancelled',
              bookingId: record.id,
              shopName: cancelBookingData.merchants.shop_name,
              serviceName: cancelBookingData.services.name,
              dateTime: cancelFormattedDateTime
            }
          );
        }
        break;

      case 'booking_completed':
        console.log('🎯 Processing booking completion notification');
        
        // Get booking details for completion
        const { data: completedBookingData, error: completedError } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            merchants!inner(shop_name)
          `)
          .eq('id', record.id)
          .single();

        if (completedError || !completedBookingData) {
          console.error('❌ Error fetching completion data:', completedError);
          break;
        }

        // Only notify authenticated customers for review requests
        if (completedBookingData.user_id) {
          await sendNotificationToAllDevices(
            completedBookingData.user_id,
            '⭐ How was your visit?',
            `Hope you enjoyed your service at ${completedBookingData.merchants.shop_name}! Tap to leave a review.`,
            {
              type: 'service_completed',
              bookingId: record.id,
              shopName: completedBookingData.merchants.shop_name,
              action: 'review'
            }
          );
        }
        break;

      default:
        console.log('❓ Unknown notification type:', type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
