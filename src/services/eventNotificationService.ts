
import { supabase } from '@/integrations/supabase/client';
import { sendNotificationToUser } from './notificationService';

export interface NotificationEvent {
  type: 'welcome' | 'new_booking' | 'booking_completed' | 'daily_reminder';
  userId: string;
  userRole: 'customer' | 'merchant';
  data?: Record<string, any>;
}

// Welcome messages for different roles
const getWelcomeMessage = (userName: string, userRole: 'customer' | 'merchant') => {
  const firstName = userName?.split(' ')[0] || 'there';
  
  if (userRole === 'merchant') {
    return {
      title: `Welcome back, ${firstName}! 🎉`,
      body: "Ready to make someone's day beautiful? Let's shine! ✨"
    };
  } else {
    return {
      title: `Welcome back, ${firstName}! 🎉`,
      body: "Let's get you looking fabulous! 💅"
    };
  }
};

// New booking messages for merchants
const getNewBookingMessage = (customerName: string, serviceName: string, timeSlot: string) => {
  const firstName = customerName?.split(' ')[0] || 'A customer';
  return {
    title: "New booking received! 💇‍♀️",
    body: `${firstName} booked ${serviceName} at ${timeSlot}. Good luck! 💪`
  };
};

// Booking completion messages for customers
const getBookingCompletedMessage = (merchantName: string) => {
  return {
    title: "Wow, got a new look? ✨",
    body: `Rate your experience with ${merchantName} — we value your feedback 💖`
  };
};

// Daily reminder messages
const getCustomerReminderMessages = () => [
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

const getMerchantReminderMessages = (merchantName: string) => {
  const firstName = merchantName?.split(' ')[0] || 'there';
  return [
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
};

// Check if user should receive notifications (respects preferences and quiet hours)
const canSendNotification = async (userId: string, notificationType: string) => {
  try {
    // Get user's notification preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_enabled, fcm_token, last_notification_sent')
      .eq('id', userId)
      .single();

    if (!profile?.notification_enabled || !profile?.fcm_token) {
      return false;
    }

    // Respect quiet hours (10 PM - 8 AM IST)
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
    const hour = istTime.getHours();
    
    if (hour >= 22 || hour < 8) {
      console.log('⏰ Skipping notification due to quiet hours:', hour);
      return false;
    }

    // For daily reminders, check if we already sent one today
    if (notificationType === 'daily_reminder') {
      const lastSent = profile.last_notification_sent ? new Date(profile.last_notification_sent) : null;
      const today = new Date().toDateString();
      
      if (lastSent && lastSent.toDateString() === today) {
        console.log('📅 Daily reminder already sent today');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return false;
  }
};

// Send welcome notification on login
export const sendWelcomeNotification = async (userId: string, userRole: 'customer' | 'merchant', userName: string) => {
  try {
    const canSend = await canSendNotification(userId, 'welcome');
    if (!canSend) return;

    const message = getWelcomeMessage(userName, userRole);
    
    await sendNotificationToUser(userId, {
      title: message.title,
      body: message.body,
      data: {
        type: 'welcome',
        userId,
        userRole,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Welcome notification sent to:', userName);
  } catch (error) {
    console.error('❌ Error sending welcome notification:', error);
  }
};

// Send new booking notification to merchant
export const sendNewBookingNotification = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  try {
    const canSend = await canSendNotification(merchantUserId, 'new_booking');
    if (!canSend) return;

    const message = getNewBookingMessage(customerName, serviceName, timeSlot);
    
    await sendNotificationToUser(merchantUserId, {
      title: message.title,
      body: message.body,
      data: {
        type: 'new_booking',
        bookingId,
        customerName,
        serviceName,
        timeSlot,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ New booking notification sent to merchant');
  } catch (error) {
    console.error('❌ Error sending new booking notification:', error);
  }
};

// Send booking completion notification to customer
export const sendBookingCompletedNotification = async (
  customerId: string,
  merchantName: string,
  bookingId: string
) => {
  try {
    const canSend = await canSendNotification(customerId, 'booking_completed');
    if (!canSend) return;

    const message = getBookingCompletedMessage(merchantName);
    
    await sendNotificationToUser(customerId, {
      title: message.title,
      body: message.body,
      data: {
        type: 'booking_completed',
        bookingId,
        merchantName,
        action: 'review',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Booking completion notification sent to customer');
  } catch (error) {
    console.error('❌ Error sending booking completion notification:', error);
  }
};

// Send daily reminder notification
export const sendDailyReminderNotification = async (
  userId: string,
  userRole: 'customer' | 'merchant',
  userName: string
) => {
  try {
    const canSend = await canSendNotification(userId, 'daily_reminder');
    if (!canSend) return;

    let message;
    if (userRole === 'customer') {
      const messages = getCustomerReminderMessages();
      const randomIndex = Math.floor(Math.random() * messages.length);
      message = messages[randomIndex];
    } else {
      const messages = getMerchantReminderMessages(userName);
      const randomIndex = Math.floor(Math.random() * messages.length);
      message = messages[randomIndex];
    }
    
    await sendNotificationToUser(userId, {
      title: message.title,
      body: message.body,
      data: {
        type: 'daily_reminder',
        userId,
        userRole,
        timestamp: new Date().toISOString()
      }
    });

    // Update last notification sent timestamp
    await supabase
      .from('profiles')
      .update({ last_notification_sent: new Date().toISOString() })
      .eq('id', userId);

    console.log('✅ Daily reminder sent to:', userName);
  } catch (error) {
    console.error('❌ Error sending daily reminder:', error);
  }
};
