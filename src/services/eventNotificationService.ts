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

// Ensure user profile exists before checking notifications
const ensureUserProfile = async (userId: string, userRole: 'customer' | 'merchant') => {
  try {
    console.log('🔧 PROFILE ENSURE: Ensuring profile exists for user:', { userId, userRole });
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, notification_enabled')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      console.log('✅ PROFILE ENSURE: Profile already exists');
      return true;
    }

    // Profile doesn't exist, create it using the security definer function
    if (userRole === 'merchant') {
      console.log('🔧 PROFILE ENSURE: Creating merchant profile...');
      const { data: result, error } = await supabase.rpc('ensure_merchant_profile', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ PROFILE ENSURE: Error creating merchant profile:', error);
        return false;
      }

      console.log('✅ PROFILE ENSURE: Merchant profile created:', result);
      return result?.success || false;
    } else {
      // For customers, try to create profile directly
      console.log('🔧 PROFILE ENSURE: Creating customer profile...');
      
      // Get user data from auth
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('❌ PROFILE ENSURE: No auth user found');
        return false;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: userData.user.user_metadata?.name || 'Customer',
          email: userData.user.email || '',
          phone: userData.user.user_metadata?.phone || '',
          role: 'customer',
          notification_enabled: true
        });

      if (insertError) {
        console.error('❌ PROFILE ENSURE: Error creating customer profile:', insertError);
        return false;
      }

      console.log('✅ PROFILE ENSURE: Customer profile created');
      return true;
    }
  } catch (error) {
    console.error('❌ PROFILE ENSURE: Unexpected error:', error);
    return false;
  }
};

// Check if user should receive notifications (respects preferences but NOT quiet hours for testing)
const canSendNotification = async (userId: string, notificationType: string) => {
  try {
    console.log('🔍 NOTIFICATION CHECK: Checking if user can receive notifications', { userId, notificationType });
    
    // Get user's notification preferences
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notification_enabled, fcm_token, last_notification_sent')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ NOTIFICATION CHECK: Error fetching profile:', error);
      return false;
    }

    if (!profile) {
      console.log('⚠️ NOTIFICATION CHECK: No profile found, attempting to create...');
      // Try to determine user role and create profile
      const userRole = await getUserRole(userId);
      const profileCreated = await ensureUserProfile(userId, userRole);
      
      if (!profileCreated) {
        console.error('❌ NOTIFICATION CHECK: Could not create profile');
        return false;
      }

      // Try to get profile again
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('notification_enabled, fcm_token, last_notification_sent')
        .eq('id', userId)
        .maybeSingle();

      if (!newProfile) {
        console.error('❌ NOTIFICATION CHECK: Still no profile after creation');
        return false;
      }

      console.log('✅ NOTIFICATION CHECK: Profile created, using new profile');
      console.log('👤 NOTIFICATION CHECK: New profile data:', {
        hasToken: !!newProfile.fcm_token,
        tokenLength: newProfile.fcm_token?.length || 0,
        notificationEnabled: newProfile.notification_enabled
      });

      if (!newProfile.notification_enabled) {
        console.log('🚫 NOTIFICATION CHECK: Notifications disabled for user');
        return false;
      }

      return true; // Allow notification even without FCM token initially
    }

    console.log('👤 NOTIFICATION CHECK: Profile data:', {
      hasToken: !!profile.fcm_token,
      tokenLength: profile.fcm_token?.length || 0,
      notificationEnabled: profile.notification_enabled,
      lastSent: profile.last_notification_sent
    });

    if (!profile.notification_enabled) {
      console.log('🚫 NOTIFICATION CHECK: Notifications disabled for user');
      return false;
    }

    // For daily reminders, check if we already sent one today
    if (notificationType === 'daily_reminder') {
      const lastSent = profile.last_notification_sent ? new Date(profile.last_notification_sent) : null;
      const today = new Date().toDateString();
      
      if (lastSent && lastSent.toDateString() === today) {
        console.log('📅 NOTIFICATION CHECK: Daily reminder already sent today');
        return false;
      }
    }

    console.log('✅ NOTIFICATION CHECK: User can receive notifications');
    return true;
  } catch (error) {
    console.error('❌ NOTIFICATION CHECK: Error checking notification permissions:', error);
    return false;
  }
};

// Helper function to determine user role
const getUserRole = async (userId: string): Promise<'customer' | 'merchant'> => {
  try {
    // Check if user is a merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return merchant ? 'merchant' : 'customer';
  } catch (error) {
    console.error('❌ Error determining user role:', error);
    return 'customer'; // Default to customer
  }
};

// Send welcome notification on login
export const sendWelcomeNotification = async (userId: string, userRole: 'customer' | 'merchant', userName: string) => {
  try {
    console.log('🎉 WELCOME NOTIFICATION: Starting send for user:', { userId, userRole, userName });
    
    const canSend = await canSendNotification(userId, 'welcome');
    if (!canSend) {
      console.log('🚫 WELCOME NOTIFICATION: Cannot send notification (permissions/token check failed)');
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
    
    const canSend = await canSendNotification(merchantUserId, 'new_booking');
    if (!canSend) {
      console.log('🚫 BOOKING NOTIFICATION: Cannot send notification to merchant (permissions/token check failed)');
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
    
    const canSend = await canSendNotification(customerId, 'booking_completed');
    if (!canSend) {
      console.log('🚫 COMPLETION NOTIFICATION: Cannot send notification to customer (permissions/token check failed)');
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
    
    const canSend = await canSendNotification(userId, 'daily_reminder');
    if (!canSend) {
      console.log('🚫 DAILY REMINDER: Cannot send notification (permissions/token check failed)');
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

    // Update last notification sent timestamp
    await supabase
      .from('profiles')
      .update({ last_notification_sent: new Date().toISOString() })
      .eq('id', userId);

    console.log('✅ DAILY REMINDER: Successfully sent to:', userName);
  } catch (error) {
    console.error('❌ DAILY REMINDER: Error sending notification:', error);
  }
};
