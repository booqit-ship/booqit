
import { supabase } from '@/integrations/supabase/client';

export interface DeviceToken {
  fcm_token: string;
  device_type: 'web' | 'android' | 'ios';
  device_name?: string;
  last_used_at: string;
}

export class MultiDeviceNotificationService {
  /**
   * Register a new device token for the current user with enhanced error handling
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
      console.log('🔑 MULTI-DEVICE: FCM Token (first 30 chars):', fcmToken.substring(0, 30) + '...');
      console.log('👤 MULTI-DEVICE: User ID:', user.id);

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      // First, check if this exact token already exists for this user
      const { data: existingToken } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('fcm_token', fcmToken)
        .single();

      if (existingToken) {
        console.log('✅ MULTI-DEVICE: Token already exists, updating last_used_at');
        await this.updateTokenLastUsed(fcmToken);
        return true;
      }

      // Check if this token exists for a different user (shouldn't happen but let's be safe)
      const { data: tokenForOtherUser } = await supabase
        .from('device_tokens')
        .select('user_id')
        .eq('fcm_token', fcmToken)
        .neq('user_id', user.id)
        .single();

      if (tokenForOtherUser) {
        console.warn('⚠️ MULTI-DEVICE: FCM token exists for different user, this might indicate a token reuse issue');
        // Deactivate the old token
        await supabase
          .from('device_tokens')
          .update({ is_active: false })
          .eq('fcm_token', fcmToken)
          .neq('user_id', user.id);
      }

      // Use the database function for reliable token registration
      const { data, error } = await supabase
        .rpc('register_device_token', {
          p_user_id: user.id,
          p_fcm_token: fcmToken,
          p_device_type: deviceType,
          p_device_name: deviceName,
          p_user_agent: userAgent
        });

      if (error) {
        console.error('❌ MULTI-DEVICE: Error registering token via RPC:', error);
        
        // Fallback to direct insert with debug info
        const { error: insertError } = await supabase
          .from('device_tokens')
          .upsert({
            user_id: user.id,
            fcm_token: fcmToken,
            device_type: deviceType,
            device_name: deviceName,
            user_agent: userAgent,
            last_used_at: new Date().toISOString(),
            is_active: true,
            debug_info: {
              registration_time: new Date().toISOString(),
              method: 'fallback_direct_insert',
              user_role: user.user_metadata?.role || 'unknown'
            }
          }, {
            onConflict: 'user_id,fcm_token'
          });

        if (insertError) {
          console.error('❌ MULTI-DEVICE: Error registering token via direct insert:', insertError);
          return false;
        }
      }

      console.log('✅ MULTI-DEVICE: Device token registered successfully');
      
      // Also update the legacy notification_settings for backward compatibility
      await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          fcm_token: fcmToken,
          notification_enabled: true
        });

      // Log device registration for debugging
      await this.logDeviceRegistration(user.id, fcmToken, deviceType, deviceName);

      return true;
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error in registerDeviceToken:', error);
      return false;
    }
  }

  /**
   * Log device registration for debugging purposes
   */
  static async logDeviceRegistration(userId: string, fcmToken: string, deviceType: string, deviceName?: string) {
    try {
      console.log('📊 MULTI-DEVICE DEBUG: Device registration logged', {
        userId,
        tokenPrefix: fcmToken.substring(0, 30) + '...',
        deviceType,
        deviceName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ MULTI-DEVICE: Error logging device registration:', error);
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

      console.log(`📱 MULTI-DEVICE: Found ${data?.length || 0} active device tokens for user ${user.id}`);

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
   * Debug device tokens for a user
   */
  static async debugUserTokens(userId?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        console.error('❌ MULTI-DEVICE DEBUG: No user ID provided');
        return;
      }

      const { data, error } = await supabase.rpc('debug_device_tokens', {
        p_user_id: targetUserId
      });

      if (error) {
        console.error('❌ MULTI-DEVICE DEBUG: Error fetching debug info:', error);
        return;
      }

      console.log('📊 MULTI-DEVICE DEBUG: Device tokens for user', targetUserId, data);
    } catch (error) {
      console.error('❌ MULTI-DEVICE DEBUG: Error in debugUserTokens:', error);
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
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Web Browser';
  }
}
