
// This service is no longer needed for email-only authentication
// All FCM token cleanup functionality has been removed
export class EnhancedTokenCleanupService {
  static async validateAndCleanupUserTokens(userId: string): Promise<number> {
    // No-op for email auth
    return 0;
  }

  static async forceRefreshUserTokens(userId: string): Promise<void> {
    // No-op for email auth
  }

  static async cleanupUserTokensOnLogout(userId: string): Promise<void> {
    // No-op for email auth
  }
}
