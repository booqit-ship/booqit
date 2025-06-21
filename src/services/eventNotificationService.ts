import { supabase } from '@/integrations/supabase/client';
import { ConsolidatedNotificationService } from './consolidatedNotificationService';

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

// Enhanced booking completion messages for customers - more motivational and aesthetic
const getBookingCompletedMessage = (merchantName: string) => {
  const messages = [
    {
      title: "✨ Looking fabulous! How was your experience?",
      body: `Your session at ${merchantName} is complete! Share your glow-up experience and help others discover their beauty transformation 💫`
    },
    {
      title: "🌟 New look, new you! Rate your experience",
      body: `Hope you're loving your fresh new style from ${merchantName}! Your review helps our community find the perfect beauty experience ✨`
    },
    {
      title: "💅 Transformation complete! Tell us about it",
      body: `Your beauty session at ${merchantName} is done! Share how amazing you feel and inspire others to book their perfect look 🎉`
    },
    {
      title: "✨ Gorgeous results! How did we do?",
      body: `You just experienced the magic at ${merchantName}! Rate your service and let others know about this amazing beauty destination 💖`
    }
  ];
  
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
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

// Enhanced notification check - create profile if missing
const canSendNotification = async (userId: string) => {
  try {
    console.log('🔍 NOTIFICATION CHECK: Checking if user can receive notifications:', userId);
    
    // Use consolidated service to check notification settings
    const settings = await ConsolidatedNotificationService.getNotificationSettings(userId);
    
    if (!settings) {
      console.log('⚠️ NOTIFICATION CHECK: No notification settings found, attempting to create profile...');
      
      // Try to get user data from auth and create profile
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError) {
          console.error('❌ NOTIFICATION CHECK: Could not get user from auth:', userError);
          return false;
        }

        if (!user) {
          console.error('❌ NOTIFICATION CHECK: User not found in auth');
          return false;
        }

        // Determine role - check if user owns a merchant account
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        const userRole = merchantData && merchantData.length > 0 ? 'merchant' : 'customer';

        // Create profile
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: user.user_metadata?.name || user.email || (userRole === 'merchant' ? 'Merchant' : 'Customer'),
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
            role: userRole,
            notification_enabled: false, 
            fcm_token: null
          });

        if (createError) {
          console.error('❌ NOTIFICATION CHECK: Failed to create profile:', createError);
          return false;
        }

        console.log('✅ NOTIFICATION CHECK: Profile created for user:', userId);
        
        return false; // Still can't send notifications until they enable them
      } catch (createError) {
        console.error('❌ NOTIFICATION CHECK: Error creating profile:', createError);
        return false;
      }
    }

    console.log('👤 NOTIFICATION CHECK: Settings data:', {
      hasToken: !!settings.fcm_token,
      notificationEnabled: settings.notification_enabled,
      failedCount: settings.failed_notification_count
    });

    if (settings.notification_enabled === false) {
      console.log('🚫 NOTIFICATION CHECK: Notifications disabled for user');
      return false;
    }

    if (!settings.fcm_token) {
      console.log('🚫 NOTIFICATION CHECK: No FCM token found - user needs to enable notifications');
      return false;
    }

    if (settings.failed_notification_count >= 5) {
      console.log('🚫 NOTIFICATION CHECK: Too many failed attempts');
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
    
    await ConsolidatedNotificationService.sendNotification(userId, {
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

// Send new booking notification to merchant
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
    
    await ConsolidatedNotificationService.sendNotification(merchantUserId, {
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

// Send booking completion notification to customer - ENHANCED with motivational messaging
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
    
    console.log('📤 COMPLETION NOTIFICATION: Sending motivational review request to customer:', message);
    
    await ConsolidatedNotificationService.sendNotification(customerId, {
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

    console.log('✅ COMPLETION NOTIFICATION: Successfully sent motivational review request to customer');
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
    
    await ConsolidatedNotificationService.sendNotification(userId, {
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
