
import { supabase } from '@/integrations/supabase/client';

export const sendSimpleNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  try {
    console.log('🔔 SIMPLE NOTIFICATION: Sending to user:', userId);

    // Get the user's FCM token from their profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('fcm_token, notification_enabled')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.log('❌ SIMPLE NOTIFICATION: Error fetching profile:', error);
      return false;
    }

    if (!profile) {
      console.log('❌ SIMPLE NOTIFICATION: No profile found for user:', userId);
      
      // Try to create profile from auth.users if it doesn't exist
      console.log('🔄 SIMPLE NOTIFICATION: Attempting to create profile...');
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        
        if (authUser?.user) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: authUser.user.user_metadata?.name || authUser.user.email || 'User',
              email: authUser.user.email || '',
              phone: authUser.user.user_metadata?.phone || '',
              role: 'merchant', // Assuming merchant for booking notifications
              notification_enabled: true
            });

          if (createError) {
            console.error('❌ SIMPLE NOTIFICATION: Failed to create profile:', createError);
          } else {
            console.log('✅ SIMPLE NOTIFICATION: Profile created, but no FCM token yet');
          }
        }
      } catch (createProfileError) {
        console.error('❌ SIMPLE NOTIFICATION: Error creating profile:', createProfileError);
      }
      
      return false;
    }

    console.log('✅ SIMPLE NOTIFICATION: Found profile with FCM token:', profile.fcm_token ? 'present' : 'missing');

    if (!profile.fcm_token) {
      console.log('❌ SIMPLE NOTIFICATION: No FCM token for user:', userId);
      return false;
    }

    if (profile.notification_enabled === false) {
      console.log('🔕 SIMPLE NOTIFICATION: Notifications disabled for user:', userId);
      return false;
    }

    console.log('✅ SIMPLE NOTIFICATION: Found profile with FCM token, sending notification...');

    // Send the notification via edge function
    const { error: notificationError } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        title,
        body,
        data
      }
    });

    if (notificationError) {
      console.error('❌ SIMPLE NOTIFICATION: Failed to send:', notificationError);
      return false;
    }

    console.log('✅ SIMPLE NOTIFICATION: Sent successfully');
    return true;
  } catch (error) {
    console.error('❌ SIMPLE NOTIFICATION: Error:', error);
    return false;
  }
};

export const sendNewBookingNotification = async (
  merchantUserId: string,
  customerName: string,
  serviceName: string,
  timeSlot: string,
  bookingId: string
) => {
  return sendSimpleNotification(
    merchantUserId,
    'New Booking! 📅',
    `${customerName} has booked ${serviceName} for ${timeSlot}`,
    {
      type: 'new_booking',
      bookingId
    }
  );
};
