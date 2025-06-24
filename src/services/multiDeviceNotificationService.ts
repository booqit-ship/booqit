
import { supabase } from '@/integrations/supabase/client';

export interface DeviceToken {
  fcm_token: string;
  device_type: 'web' | 'android' | 'ios';
  device_name?: string;
  last_used_at: string;
}

export class MultiDeviceNotificationService {
  /**
   * Register a new device token for the current user
   */
  static async registerDeviceToken(
    fcmToken: string,
    deviceType: 'web' | 'android' | 'ios',
    deviceName?: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ MULTI-DEVICE: User not authenticated');
        return false;
      }

      console.log('📱 MULTI-DEVICE: Registering token for device:', deviceType, deviceName);

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      const { data, error } = await supabase.rpc('register_device_token', {
        p_user_id: user.id,
        p_fcm_token: fcmToken,
        p_device_type: deviceType,
        p_device_name: deviceName,
        p_user_agent: userAgent
      });

      if (error) {
        console.error('❌ MULTI-DEVICE: Error registering token:', error);
        return false;
      }

      if (data?.success) {
        console.log('✅ MULTI-DEVICE: Device token registered successfully');
        return true;
      }

      console.error('❌ MULTI-DEVICE: Failed to register token:', data);
      return false;
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error in registerDeviceToken:', error);
      return false;
    }
  }

  /**
   * Get all active device tokens for the current user
   */
  static async getUserDeviceTokens(): Promise<DeviceToken[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ MULTI-DEVICE: User not authenticated');
        return [];
      }

      const { data, error } = await supabase.rpc('get_user_device_tokens', {
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ MULTI-DEVICE: Error fetching device tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error in getUserDeviceTokens:', error);
      return [];
    }
  }

  /**
   * Remove a specific device token
   */
  static async removeDeviceToken(fcmToken: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ MULTI-DEVICE: User not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('fcm_token', fcmToken);

      if (error) {
        console.error('❌ MULTI-DEVICE: Error removing device token:', error);
        return false;
      }

      console.log('✅ MULTI-DEVICE: Device token removed successfully');
      return true;
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error in removeDeviceToken:', error);
      return false;
    }
  }

  /**
   * Update last used timestamp for a device token
   */
  static async updateTokenLastUsed(fcmToken: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('device_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('fcm_token', fcmToken);
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error updating token last used:', error);
    }
  }

  /**
   * Get device type from user agent or platform
   */
  static getDeviceType(): 'web' | 'android' | 'ios' {
    if (typeof window === 'undefined') return 'web';

    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    
    return 'web';
  }

  /**
   * Get a friendly device name
   */
  static getDeviceName(): string {
    if (typeof window === 'undefined') return 'Web Browser';

    const userAgent = navigator.userAgent;
    
    // Extract browser name
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Web Browser';
  }
}
