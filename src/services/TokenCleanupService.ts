
import { supabase } from '@/integrations/supabase/client';

/**
 * Service to clean up expired and invalid tokens
 */
export class TokenCleanupService {
  /**
   * Clean up expired tokens from the database
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      console.log('🧹 CLEANUP: Starting token cleanup...');

      // Call the existing cleanup function
      const { data, error } = await supabase.rpc('cleanup_inactive_tokens');

      if (error) {
        console.error('❌ CLEANUP: Error calling cleanup function:', error);
        return;
      }

      console.log('✅ CLEANUP: Cleanup completed:', data);
    } catch (error) {
      console.error('❌ CLEANUP: Error during token cleanup:', error);
    }
  }

  /**
   * Remove invalid tokens for a specific user
   */
  static async removeInvalidTokensForUser(userId: string): Promise<void> {
    try {
      console.log('🧹 CLEANUP: Removing invalid tokens for user:', userId);

      // Remove tokens that are older than 30 days
      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .lt('last_used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('❌ CLEANUP: Error removing invalid tokens:', error);
      } else {
        console.log('✅ CLEANUP: Invalid tokens removed for user');
      }
    } catch (error) {
      console.error('❌ CLEANUP: Error during user token cleanup:', error);
    }
  }
}
