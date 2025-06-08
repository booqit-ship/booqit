
import { supabase } from '@/integrations/supabase/client';
import { sendNotificationToUser } from './notificationService';

// Welcome notification on login
export const sendWelcomeNotification = async (userId: string, userName: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🎉 Sending welcome notification to:', userName, userRole);
    
    // Check if we already sent welcome today to avoid spam
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLog } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'welcome')
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .single();

    if (existingLog) {
      console.log('✅ Welcome notification already sent today');
      return;
    }

    const firstName = userName.split(' ')[0];
    const welcomeMessage = userRole === 'merchant' 
      ? `Welcome back, ${firstName}! 🎉\nLet's make today beautiful for your customers ✨`
      : `Welcome back, ${firstName}! 🎉\nLet's get you looking fabulous 💅`;

    await sendNotificationToUser(userId, {
      title: 'Welcome Back! 👋',
      body: welcomeMessage,
      data: {
        type: 'welcome',
        userRole,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Welcome notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending welcome notification:', error);
  }
};

// New booking notification to merchant
export const sendNewBookingNotification = async (merchantId: string, bookingDetails: {
  customerName: string;
  serviceName: string;
  timeSlot: string;
  date: string;
}) => {
  try {
    console.log('📅 Sending new booking notification to merchant:', merchantId);
    
    const { customerName, serviceName, timeSlot, date } = bookingDetails;
    const firstName = customerName.split(' ')[0];
    
    // Format time nicely
    const bookingTime = new Date(`${date}T${timeSlot}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const bookingDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    await sendNotificationToUser(merchantId, {
      title: 'New booking received! 💇‍♀️',
      body: `${firstName} booked ${serviceName} on ${bookingDate} at ${bookingTime}. Good luck! 💪`,
      data: {
        type: 'new_booking',
        merchantId,
        customerName,
        serviceName,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ New booking notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending new booking notification:', error);
  }
};

// Booking completion notification to customer
export const sendBookingCompletionNotification = async (customerId: string, merchantName: string, bookingId: string) => {
  try {
    console.log('✅ Sending booking completion notification to customer:', customerId);
    
    const shopName = merchantName.includes('shop') ? merchantName : `${merchantName}'s salon`;

    await sendNotificationToUser(customerId, {
      title: 'Wow, got a new look? ✨',
      body: `Rate your experience with ${shopName} — we value your feedback 💖`,
      data: {
        type: 'review_request',
        customerId,
        bookingId,
        merchantName,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Booking completion notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking completion notification:', error);
  }
};

// Daily reminder notifications
export const sendDailyCustomerReminder = async (userId: string, userName: string) => {
  try {
    console.log('🔁 Sending daily customer reminder to:', userName);
    
    const firstName = userName.split(' ')[0];
    const reminderMessages = [
      `Self-care check-in, ${firstName}! 🧖\nBook your next beauty session now — slots are filling fast!`,
      `Your favorite salon is waiting, ${firstName}! 💅\nTreat yourself today, you deserve it.`,
      `Ready for a glow-up, ${firstName}? ✨\nTap to explore the best salons around you.`,
      `Time for some me-time, ${firstName}! 💆‍♀️\nYour next transformation is just a booking away.`
    ];

    // Rotate messages based on day of year to avoid repetition
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const selectedMessage = reminderMessages[dayOfYear % reminderMessages.length];

    await sendNotificationToUser(userId, {
      title: 'Beauty Call! 📞✨',
      body: selectedMessage,
      data: {
        type: 'daily_reminder_customer',
        userId,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Daily customer reminder sent successfully');
  } catch (error) {
    console.error('❌ Error sending daily customer reminder:', error);
  }
};

export const sendDailyMerchantMotivation = async (userId: string, userName: string) => {
  try {
    console.log('💼 Sending daily merchant motivation to:', userName);
    
    const firstName = userName.split(' ')[0];
    const motivationMessages = [
      `Good morning, ${firstName}! ☀️\nLet's make today beautiful — check your bookings and shine 💇‍♂️✨`,
      `You're one booking away from someone's transformation, ${firstName}! 💖\nKeep up the great work!`,
      `Another day, another glow-up to deliver, ${firstName}! 💪\nOpen your calendar to see who's waiting for you.`,
      `Rise and shine, ${firstName}! 🌅\nYour talent is about to make someone's day brighter ✨`
    ];

    // Rotate messages based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const selectedMessage = motivationMessages[dayOfYear % motivationMessages.length];

    await sendNotificationToUser(userId, {
      title: 'Good Morning, Beauty Pro! 🌟',
      body: selectedMessage,
      data: {
        type: 'daily_reminder_merchant',
        userId,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Daily merchant motivation sent successfully');
  } catch (error) {
    console.error('❌ Error sending daily merchant motivation:', error);
  }
};

// Helper function to check if notifications should be sent (respect DND hours)
export const isDuringQuietHours = () => {
  const now = new Date();
  const hour = now.getHours();
  // Quiet hours: 10 PM to 8 AM (22:00 to 08:00)
  return hour >= 22 || hour < 8;
};

// Send daily reminders to all eligible users
export const sendDailyReminders = async () => {
  try {
    if (isDuringQuietHours()) {
      console.log('🔕 Skipping daily reminders during quiet hours');
      return;
    }

    console.log('🔁 Starting daily reminder batch...');
    
    // Get all users with notifications enabled
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, role, fcm_token, notification_enabled')
      .eq('notification_enabled', true)
      .not('fcm_token', 'is', null);

    if (error) {
      console.error('❌ Error fetching profiles for daily reminders:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('📭 No users found for daily reminders');
      return;
    }

    for (const profile of profiles) {
      try {
        // Check if we already sent a daily reminder today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingLog } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', profile.id)
          .like('type', 'daily_reminder_%')
          .gte('sent_at', `${today}T00:00:00.000Z`)
          .single();

        if (existingLog) {
          console.log(`✅ Daily reminder already sent today to ${profile.name}`);
          continue;
        }

        if (profile.role === 'customer') {
          await sendDailyCustomerReminder(profile.id, profile.name);
        } else if (profile.role === 'merchant') {
          await sendDailyMerchantMotivation(profile.id, profile.name);
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (profileError) {
        console.error(`❌ Error sending daily reminder to ${profile.name}:`, profileError);
        continue;
      }
    }

    console.log('✅ Daily reminder batch completed');
  } catch (error) {
    console.error('❌ Error in sendDailyReminders:', error);
  }
};
