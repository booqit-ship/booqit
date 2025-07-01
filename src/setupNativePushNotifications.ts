import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const setupNativePushNotifications = async () => {
  try {
    // 1. Create Android notification channel (Required for Android 8.0+)
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'Default',
      importance: 5, // HIGH importance
      description: 'General notifications for BooqIt',
      sound: 'default',
    });

    // 2. Request local notification permissions
    const localPermission = await LocalNotifications.requestPermissions();
    if (localPermission.display !== 'granted') {
      console.warn('❌ Local notifications permission not granted');
    }

    // 3. Request push notification permissions
    const pushPermission = await PushNotifications.checkPermissions();
    if (pushPermission.receive !== 'granted') {
      const requestStatus = await PushNotifications.requestPermissions();
      if (requestStatus.receive !== 'granted') {
        console.warn('❌ Push notification permission denied by user');
        return;
      }
    }

    // 4. Register for push notifications
    await PushNotifications.register();

    // 5. Handle successful registration and save token
    PushNotifications.addListener('registration', async (token) => {
      console.log('✅ Push registration success, token:', token.value);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id && token?.value) {
        const { error } = await supabase
          .from('device_tokens')
          .upsert(
            {
              user_id: session.user.id,
              fcm_token: token.value,
              device_type: Capacitor.getPlatform(),
              is_active: true,
              last_used_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,fcm_token',
            }
          );

        if (error) {
          console.error('❌ Failed to save FCM token:', error);
        } else {
          console.log('✅ FCM token saved to Supabase');
        }
      }
    });

    // 6. Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration failed:', error);
    });

    // 7. Handle push notification received in foreground
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('📩 Push notification received in foreground:', notification);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: notification.title ?? '📢 Notification',
            body: notification.body ?? 'You have a new message.',
            schedule: { at: new Date(Date.now() + 100) },
            smallIcon: 'ic_stat_notify',
            channelId: 'default',
            iconColor: '#FFFFFF',
          },
        ],
      });
    });

    // 8. Handle notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('▶️ Notification action performed:', action.notification);
      // Optional: Navigate to screen or take action
    });
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
  }
};