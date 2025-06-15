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

// Simple notification check - just verify if user has notifications enabled
const canSendNotification = async (userId: string) => {
  try {
    console.log('🔍 NOTIFICATION CHECK: Checking if user can receive notifications:', userId);
    
    // Get user's notification preferences
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notification_enabled, fcm_token')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ NOTIFICATION CHECK: Error fetching profile:', error);
      return false;
    }

    if (!profile) {
      console.log('⚠️ NOTIFICATION CHECK: No profile found for user - they need to enable notifications first');
      return false;
    }

    console.log('👤 NOTIFICATION CHECK: Profile data:', {
      hasToken: !!profile.fcm_token,
      notificationEnabled: profile.notification_enabled
    });

    if (profile.notification_enabled === false) {
      console.log('🚫 NOTIFICATION CHECK: Notifications disabled for user');
      return false;
    }

    if (!profile.fcm_token) {
      console.log('🚫 NOTIFICATION CHECK: No FCM token found - user needs to enable notifications');
      return false;
    }

    console.log('✅ NOTIFICATION CHECK: User can receive notifications');
    return true;
  } catch (error) {
    console.error('❌ NOTIFICATION CHECK: Error checking notification permissions:', error);
    return false;
  }
};

// Send welcome notification on login
export const sendWelcomeNotification = async (userId: string, userRole: 'customer' | 'merchant', userName: string) => {
  try {
    console.log('🎉 WELCOME NOTIFICATION: Starting send for user:', { userId, userRole, userName });
    
    const canSend = await canSendNotification(userId);
    if (!canSend) {
      console.log('🚫 WELCOME NOTIFICATION: Cannot send notification - user needs to enable notifications first');
      return;
    }

    const message = getWelcomeMessage(userName, userRole);
    
    console.log('📤 WELCOME NOTIFICATION: Sending notification:', message);
    
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

    console.log('✅ WELCOME NOTIFICATION: Successfully sent to:', userName);
  } catch (error) {
    console.error('❌ WELCOME NOTIFICATION: Error sending notification:', error);
  }
};

// Send new booking notification to merchant - SIMPLIFIED
export const sendNewBookingNotification = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  try {
    console.log('🆕 BOOKING NOTIFICATION: Starting send to merchant:', { 
      merchantUserId, 
      customerName, 
      serviceName, 
      timeSlot, 
      bookingId 
    });
    
    const canSend = await canSendNotification(merchantUserId);
    if (!canSend) {
      console.log('🚫 BOOKING NOTIFICATION: Cannot send notification - merchant needs to enable notifications in their app first');
      return;
    }

    const message = getNewBookingMessage(customerName, serviceName, timeSlot);
    
    console.log('📤 BOOKING NOTIFICATION: Sending notification to merchant:', message);
    
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

    console.log('✅ BOOKING NOTIFICATION: Successfully sent to merchant');
  } catch (error) {
    console.error('❌ BOOKING NOTIFICATION: Error sending notification to merchant:', error);
    console.error('💡 BOOKING NOTIFICATION: Merchant should open the app and enable notifications to receive booking alerts');
  }
};

// Send booking completion notification to customer
export const sendBookingCompletedNotification = async (
  customerId: string,
  merchantName: string,
  bookingId: string
) => {
  try {
    console.log('🎯 COMPLETION NOTIFICATION: Starting send to customer:', { 
      customerId, 
      merchantName, 
      bookingId 
    });
    
    const canSend = await canSendNotification(customerId);
    if (!canSend) {
      console.log('🚫 COMPLETION NOTIFICATION: Cannot send notification to customer');
      return;
    }

    const message = getBookingCompletedMessage(merchantName);
    
    console.log('📤 COMPLETION NOTIFICATION: Sending notification to customer:', message);
    
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

    console.log('✅ COMPLETION NOTIFICATION: Successfully sent to customer');
  } catch (error) {
    console.error('❌ COMPLETION NOTIFICATION: Error sending notification to customer:', error);
  }
};

// Send daily reminder notification
export const sendDailyReminderNotification = async (
  userId: string,
  userRole: 'customer' | 'merchant',
  userName: string
) => {
  try {
    console.log('⏰ DAILY REMINDER: Starting send for user:', { userId, userRole, userName });
    
    const canSend = await canSendNotification(userId);
    if (!canSend) {
      console.log('🚫 DAILY REMINDER: Cannot send notification');
      return;
    }

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
    
    console.log('📤 DAILY REMINDER: Sending notification:', message);
    
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

    // Update last notification sent timestamp if profile exists
    await supabase
      .from('profiles')
      .update({ last_notification_sent: new Date().toISOString() })
      .eq('id', userId);

    console.log('✅ DAILY REMINDER: Successfully sent to:', userName);
  } catch (error) {
    console.error('❌ DAILY REMINDER: Error sending notification:', error);
  }
};
