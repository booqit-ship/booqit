
declare global {
  interface Window {
    OneSignal: any;
  }
}

class OneSignalService {
  private initialized = false;
  private appId = 'd5a0614a-d4fc-45a0-81d4-cff762b376dd';

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔔 OneSignal already initialized');
      return;
    }

    try {
      console.log('🔔 Initializing OneSignal...');
      
      if (!window.OneSignal) {
        console.error('❌ OneSignal SDK not loaded');
        throw new Error('OneSignal SDK not available');
      }

      await window.OneSignal.init({
        appId: this.appId,
        safari_web_id: "web.onesignal.auto.18b6e89e-2e55-4554-bb27-d99aecae96b9",
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false, // We'll handle registration manually
        autoResubscribe: true,
        showCredit: false,
        persistNotification: true,
        welcomeNotification: {
          disable: true
        },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
                text: {
                  actionMessage: "Get instant notifications when customers book appointments!",
                  acceptButton: "Allow",
                  cancelButton: "No Thanks"
                },
                delay: {
                  pageViews: 1,
                  timeDelay: 2
                }
              }
            ]
          }
        }
      });

      this.initialized = true;
      console.log('✅ OneSignal initialized successfully');

      // Set up debug listeners
      this.setupDebugListeners();

    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      throw error;
    }
  }

  private setupDebugListeners(): void {
    if (!window.OneSignal) return;

    window.OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
      console.log('🔔 Push subscription changed:', event);
    });

    window.OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
      console.log('🔔 Permission changed:', event);
    });
  }

  async setUserId(userId: string): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ OneSignal not initialized, cannot set user ID');
      return;
    }

    try {
      console.log('🔔 Setting OneSignal user ID:', userId);
      
      // For OneSignal v5, use the new User API
      await window.OneSignal.login(userId);
      
      console.log('✅ OneSignal user ID set successfully:', userId);
      
      // Verify the user ID was set
      const currentUserId = await this.getCurrentUserId();
      console.log('🔔 Current OneSignal user ID after setting:', currentUserId);
      
    } catch (error) {
      console.error('❌ Failed to set OneSignal user ID:', error);
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    if (!this.initialized || !window.OneSignal) return null;

    try {
      const onesignalId = await window.OneSignal.User.onesignalId;
      const externalId = await window.OneSignal.User.externalId;
      
      console.log('🔔 OneSignal IDs - OneSignal ID:', onesignalId, 'External ID:', externalId);
      return externalId || onesignalId;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.initialized || !window.OneSignal) return false;

    try {
      const permission = await window.OneSignal.Notifications.permission;
      const pushSubscription = await window.OneSignal.User.PushSubscription.optedIn;
      
      console.log('🔔 Subscription status - Permission:', permission, 'Opted In:', pushSubscription);
      return permission === 'granted' && pushSubscription;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.initialized || !window.OneSignal) {
      console.error('❌ OneSignal not initialized');
      return false;
    }

    try {
      console.log('🔔 Requesting notification permission...');
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('🔔 Permission result:', permission);
      return permission;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  async showSlidedownPrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Showing slidedown prompt...');
      await window.OneSignal.slidedown.promptPush();
    } catch (error) {
      console.error('❌ Error showing slidedown prompt:', error);
    }
  }

  async showNativePrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Showing native prompt...');
      await window.OneSignal.showNativePrompt();
    } catch (error) {
      console.error('❌ Error showing native prompt:', error);
    }
  }

  async forcePermissionPrompt(): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Starting aggressive permission flow...');
      
      // Check current status
      const isCurrentlySubscribed = await this.isSubscribed();
      if (isCurrentlySubscribed) {
        console.log('✅ User already subscribed');
        return;
      }

      // Try slidedown first
      await this.showSlidedownPrompt();
      
      // Wait a bit and check
      setTimeout(async () => {
        const stillNotSubscribed = !(await this.isSubscribed());
        if (stillNotSubscribed) {
          console.log('🔔 Slidedown failed, trying native prompt...');
          await this.showNativePrompt();
        }
      }, 2000);

      // Final fallback - direct permission request
      setTimeout(async () => {
        const stillNotSubscribed = !(await this.isSubscribed());
        if (stillNotSubscribed) {
          console.log('🔔 All prompts failed, trying direct permission...');
          await this.requestPermission();
        }
      }, 4000);

    } catch (error) {
      console.error('❌ Error in force permission flow:', error);
    }
  }

  async addTag(key: string, value: string): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Adding tag:', key, '=', value);
      await window.OneSignal.User.addTag(key, value);
      console.log('✅ Tag added successfully');
    } catch (error) {
      console.error('❌ Error adding tag:', error);
    }
  }

  async removeTag(key: string): Promise<void> {
    if (!this.initialized || !window.OneSignal) return;

    try {
      console.log('🔔 Removing tag:', key);
      await window.OneSignal.User.removeTag(key);
      console.log('✅ Tag removed successfully');
    } catch (error) {
      console.error('❌ Error removing tag:', error);
    }
  }

  async getSubscriptionDetails(): Promise<any> {
    if (!this.initialized || !window.OneSignal) return null;

    try {
      const details = {
        permission: await window.OneSignal.Notifications.permission,
        optedIn: await window.OneSignal.User.PushSubscription.optedIn,
        id: await window.OneSignal.User.PushSubscription.id,
        token: await window.OneSignal.User.PushSubscription.token,
        onesignalId: await window.OneSignal.User.onesignalId,
        externalId: await window.OneSignal.User.externalId,
      };
      
      console.log('🔔 Full subscription details:', details);
      return details;
    } catch (error) {
      console.error('❌ Error getting subscription details:', error);
      return null;
    }
  }
}

export const oneSignalService = new OneSignalService();
