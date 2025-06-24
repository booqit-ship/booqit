
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

      // Since RPC function types aren't available, we'll use raw SQL approach
      const { data, error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: user.id,
          fcm_token: fcmToken,
          device_type: deviceType,
          device_name: deviceName,
          user_agent: userAgent,
          last_used_at: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'user_id,fcm_token'
        });

      if (error) {
        console.error('❌ MULTI-DEVICE: Error registering token:', error);
        return false;
      }

      console.log('✅ MULTI-DEVICE: Device token registered successfully');
      return true;
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

      const { data, error } = await supabase
        .from('device_tokens')
        .select('fcm_token, device_type, device_name, last_used_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('❌ MULTI-DEVICE: Error fetching device tokens:', error);
        return [];
      }

      return (data || []).map(token => ({
        fcm_token: token.fcm_token,
        device_type: token.device_type as 'web' | 'android' | 'ios',
        device_name: token.device_name || undefined,
        last_used_at: token.last_used_at
      }));
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
