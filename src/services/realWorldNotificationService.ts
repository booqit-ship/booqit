
import { supabase } from '@/integrations/supabase/client';
import { sendNotificationToUser } from './notificationService';

export interface BookingCreatedEvent {
  booking_id: string;
  customer_id: string;
  merchant_id: string;
  customer_name: string;
  merchant_name: string;
  service_name: string;
  time_slot: string;
  date: string;
}

export interface BookingCompletedEvent {
  booking_id: string;
  customer_id: string;
  merchant_name: string;
}

// Send notification when a new booking is created
export const handleNewBookingNotification = async (bookingData: BookingCreatedEvent) => {
  try {
    console.log('🔔 Handling new booking notification:', bookingData);

    // Send notification to merchant about new booking
    await sendNotificationToUser(bookingData.merchant_id, {
      title: 'New booking received! 💇‍♀️',
      body: `${bookingData.customer_name} booked ${bookingData.service_name} for ${bookingData.time_slot}`,
      data: {
        type: 'new_booking',
        booking_id: bookingData.booking_id,
        customer_id: bookingData.customer_id,
        customer_name: bookingData.customer_name,
        service_name: bookingData.service_name,
        time_slot: bookingData.time_slot,
        date: bookingData.date,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ New booking notification sent to merchant:', bookingData.merchant_id);
  } catch (error) {
    console.error('❌ Error sending new booking notification:', error);
  }
};

// Send notification when a booking is completed
export const handleBookingCompletedNotification = async (completionData: BookingCompletedEvent) => {
  try {
    console.log('🔔 Handling booking completion notification:', completionData);

    // Send review request to customer
    await sendNotificationToUser(completionData.customer_id, {
      title: 'How was your visit? ⭐',
      body: `Hope you enjoyed your service at ${completionData.merchant_name}! Please leave a review.`,
      data: {
        type: 'review_request',
        booking_id: completionData.booking_id,
        merchant_name: completionData.merchant_name,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Booking completion notification sent to customer:', completionData.customer_id);
  } catch (error) {
    console.error('❌ Error sending booking completion notification:', error);
  }
};

// Send welcome notification when user logs in
export const handleUserLoginNotification = async (userId: string, userRole: 'customer' | 'merchant', userName: string) => {
  try {
    console.log('🔔 Handling user login notification:', { userId, userRole, userName });

    // Check if user has FCM token and notifications enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled, last_notification_sent')
      .eq('id', userId)
      .single();

    if (!profile?.fcm_token || !profile?.notification_enabled) {
      console.log('⏭️ Skipping welcome notification - no token or disabled');
      return;
    }

    // Check if we already sent a welcome notification today
    const lastSent = profile.last_notification_sent ? new Date(profile.last_notification_sent) : null;
    const today = new Date().toDateString();
    
    if (lastSent && lastSent.toDateString() === today) {
      console.log('⏭️ Skipping welcome notification - already sent today');
      return;
    }

    const firstName = userName?.split(' ')[0] || 'there';
    
    let welcomeMessage;
    if (userRole === 'merchant') {
      welcomeMessage = {
        title: `Welcome back, ${firstName}! 🎉`,
        body: "Ready to make someone's day beautiful? Let's shine! ✨"
      };
    } else {
      welcomeMessage = {
        title: `Welcome back, ${firstName}! 🎉`,
        body: "Let's get you looking fabulous! 💅"
      };
    }

    await sendNotificationToUser(userId, {
      title: welcomeMessage.title,
      body: welcomeMessage.body,
      data: {
        type: 'welcome',
        user_role: userRole,
        timestamp: new Date().toISOString()
      }
    });

    // Update last notification sent
    await supabase
      .from('profiles')
      .update({ last_notification_sent: new Date().toISOString() })
      .eq('id', userId);

    console.log('✅ Welcome notification sent to user:', userId);
  } catch (error) {
    console.error('❌ Error sending welcome notification:', error);
  }
};

// Monitor booking status changes and trigger notifications
export const setupBookingStatusListener = () => {
  console.log('🔔 Setting up booking status listener...');

  // Listen for new bookings
  const bookingChannel = supabase
    .channel('booking_notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings'
      },
      async (payload) => {
        console.log('📅 New booking detected:', payload.new);
        
        try {
          // Get additional booking details
          const { data: bookingDetails, error } = await supabase
            .from('bookings')
            .select(`
              id,
              user_id,
              merchant_id,
              customer_name,
              time_slot,
              date,
              services,
              merchants!inner(shop_name),
              profiles!bookings_user_id_fkey!inner(name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error || !bookingDetails) {
            console.error('❌ Could not fetch booking details:', error);
            return;
          }

          // Extract service names from services JSON
          const serviceNames = bookingDetails.services?.map((s: any) => s.name).join(', ') || 'Service';

          await handleNewBookingNotification({
            booking_id: bookingDetails.id,
            customer_id: bookingDetails.user_id,
            merchant_id: bookingDetails.merchant_id,
            customer_name: bookingDetails.customer_name || bookingDetails.profiles?.name || 'Customer',
            merchant_name: bookingDetails.merchants?.shop_name || 'Merchant',
            service_name: serviceNames,
            time_slot: bookingDetails.time_slot,
            date: bookingDetails.date
          });
        } catch (error) {
          console.error('❌ Error processing new booking notification:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings'
      },
      async (payload) => {
        console.log('📝 Booking updated:', payload.new);
        
        // Check if status changed to completed
        if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
          try {
            // Get booking details for completion notification
            const { data: bookingDetails, error } = await supabase
              .from('bookings')
              .select(`
                id,
                user_id,
                merchants!inner(shop_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error || !bookingDetails) {
              console.error('❌ Could not fetch booking details for completion:', error);
              return;
            }

            await handleBookingCompletedNotification({
              booking_id: bookingDetails.id,
              customer_id: bookingDetails.user_id,
              merchant_name: bookingDetails.merchants?.shop_name || 'your merchant'
            });
          } catch (error) {
            console.error('❌ Error processing booking completion notification:', error);
          }
        }
      }
    )
    .subscribe();

  console.log('✅ Booking status listener set up successfully');
  return bookingChannel;
};
