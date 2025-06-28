
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced Token Cleanup Service with improved logout and token management
 */
export class EnhancedTokenCleanupService {
  /**
   * Clean up all tokens for a specific user on logout
   */
  static async cleanupUserTokensOnLogout(userId: string): Promise<void> {
    try {
      console.log('🧹 CLEANUP: Starting user token cleanup on logout for:', userId);

      // Deactivate all tokens for this user
      const { error } = await supabase
        .from('device_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ CLEANUP: Error deactivating user tokens:', error);
      } else {
        console.log('✅ CLEANUP: All user tokens deactivated successfully');
      }

      // Also clean up legacy notification_settings
      const { error: legacyError } = await supabase
        .from('notification_settings')
        .update({ 
          fcm_token: null,
          notification_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (legacyError) {
        console.error('❌ CLEANUP: Error clearing legacy settings:', legacyError);
      } else {
        console.log('✅ CLEANUP: Legacy notification settings cleared');
      }

    } catch (error) {
      console.error('❌ CLEANUP: Error during user logout cleanup:', error);
    }
  }

  /**
   * Force refresh tokens for a user (useful when tokens become stale)
   */
  static async forceRefreshUserTokens(userId: string): Promise<void> {
    try {
      console.log('🔄 CLEANUP: Force refreshing tokens for user:', userId);

      // Mark all existing tokens as inactive
      const { error: deactivateError } = await supabase
        .from('device_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (deactivateError) {
        console.error('❌ CLEANUP: Error deactivating old tokens:', deactivateError);
      } else {
        console.log('✅ CLEANUP: Old tokens deactivated, ready for fresh registration');
      }

    } catch (error) {
      console.error('❌ CLEANUP: Error during token refresh:', error);
    }
  }

  /**
   * Clean up expired and invalid tokens globally
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      console.log('🧹 CLEANUP: Starting global token cleanup...');

      // Deactivate tokens older than 30 days
      const { error: expiredError } = await supabase
        .from('device_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .lt('last_used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('is_active', true);

      if (expiredError) {
        console.error('❌ CLEANUP: Error cleaning expired tokens:', expiredError);
      } else {
        console.log('✅ CLEANUP: Expired tokens cleaned up');
      }

      // Call the existing cleanup function
      const { data, error } = await supabase.rpc('cleanup_inactive_tokens');

      if (error) {
        console.error('❌ CLEANUP: Error calling cleanup function:', error);
      } else {
        console.log('✅ CLEANUP: Database cleanup completed:', data);
      }

    } catch (error) {
      console.error('❌ CLEANUP: Error during global cleanup:', error);
    }
  }
}
