
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class UnifiedNotificationService {
  /**
   * Initialize notifications for the current platform
   */
  static async initialize(): Promise<string | null> {
    const isNative = Capacitor.isNativePlatform();
    console.log(`🔔 UNIFIED: Initializing notifications for ${isNative ? 'native' : 'web'} platform`);
    
    try {
      if (isNative) {
        return await this.initializeNative();
      } else {
        return await this.initializeWeb();
      }
    } catch (error) {
      console.error('❌ UNIFIED: Failed to initialize notifications:', error);
      return null;
    }
  }

  /**
   * Initialize native notifications (Android/iOS)
   */
  private static async initializeNative(): Promise<string | null> {
    try {
      console.log('📱 UNIFIED: Requesting native permissions...');
      
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('❌ UNIFIED: Native permission denied');
        toast.error('Notification permission denied');
        return null;
      }

      console.log('✅ UNIFIED: Native permission granted, registering...');
      await PushNotifications.register();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏰ UNIFIED: Native registration timeout');
          resolve(null);
        }, 15000);

        PushNotifications.addListener('registration', (token) => {
          console.log('✅ UNIFIED: Native token received:', token.value.substring(0, 30) + '...');
          clearTimeout(timeout);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ UNIFIED: Native registration error:', error);
          clearTimeout(timeout);
          resolve(null);
        });
      });
    } catch (error) {
      console.error('❌ UNIFIED: Native initialization error:', error);
      return null;
    }
  }

  /**
   * Initialize web notifications
   */
  private static async initializeWeb(): Promise<string | null> {
    try {
      const { setupNotifications } = await import('@/firebase');
      return await setupNotifications();
    } catch (error) {
      console.error('❌ UNIFIED: Web initialization error:', error);
      return null;
    }
  }

  /**
   * Register device token with Supabase
   */
  static async registerToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      const deviceInfo = this.getDeviceInfo();
      
      const { data, error } = await supabase.rpc('register_device_token', {
        p_user_id: userId,
        p_fcm_token: fcmToken,
        p_device_type: deviceInfo.type,
        p_device_name: deviceInfo.name,
        p_user_agent: navigator.userAgent
      });

      if (error) {
        console.error('❌ UNIFIED: Token registration failed:', error);
        return false;
      }

      console.log('✅ UNIFIED: Token registered successfully');
      return true;
    } catch (error) {
      console.error('❌ UNIFIED: Token registration error:', error);
      return false;
    }
  }

  /**
   * Get device information
   */
  private static getDeviceInfo() {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const ua = navigator.userAgent;

    if (isNative) {
      return {
        type: platform === 'ios' ? 'ios' : 'android',
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} App`
      };
    } else {
      const isChrome = /Chrome/i.test(ua);
      const isFirefox = /Firefox/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
      
      return {
        type: 'web',
        name: isChrome ? 'Chrome Browser' : isFirefox ? 'Firefox Browser' : isSafari ? 'Safari Browser' : 'Browser'
      };
    }
  }

  /**
   * Setup notification listeners for native platforms
   */
  static setupNativeListeners() {
    if (!Capacitor.isNativePlatform()) return;

    console.log('📱 UNIFIED: Setting up native notification listeners');

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📱 UNIFIED: Native notification received:', notification);
      
      // Show toast for foreground notifications
      if (notification.title && notification.body) {
        toast(notification.title, {
          description: notification.body,
          duration: 5000
        });
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('📱 UNIFIED: Native notification action:', action);
      // Handle notification tap actions here
    });
  }

  /**
   * Send test notification
   */
  static async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          title: '🔔 Test Notification',
          body: `This is a test notification from BooqIt on ${Capacitor.getPlatform()}!`,
          data: {
            type: 'test',
            platform: Capacitor.getPlatform(),
            timestamp: Date.now()
          }
        }
      });

      if (error) {
        console.error('❌ UNIFIED: Test notification failed:', error);
        toast.error('Failed to send test notification');
        return false;
      }

      if (data?.success) {
        console.log('✅ UNIFIED: Test notification sent successfully');
        toast.success('Test notification sent!');
        return true;
      } else {
        console.error('❌ UNIFIED: Test notification failed:', data?.error);
        toast.error(data?.error || 'Failed to send notification');
        return false;
      }
    } catch (error) {
      console.error('❌ UNIFIED: Test notification error:', error);
      toast.error('Error sending test notification');
      return false;
    }
  }
}
